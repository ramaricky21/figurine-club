"""Importazione automatica FACOLTATIVA da CSV HTTPS pubblico a Firebase Firestore.
Richiede: pip install firebase-admin
Variabili: CATALOG_CSV_URL, FIREBASE_SERVICE_ACCOUNT (JSON di account di servizio).
Non inserire MAI le credenziali nel repository pubblico.
"""
from __future__ import annotations

import csv
import io
import json
import os
from collections import defaultdict
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def parse_csv(data: bytes) -> list[dict]:
    if not data or len(data) > 2_000_000:
        raise ValueError('CSV vuoto o oltre 2 MB.')
    decoded = data.decode('utf-8-sig')
    first = decoded.splitlines()[0] if decoded.splitlines() else ''
    delimiter = ';' if first.count(';') > first.count(',') else ','
    reader = csv.DictReader(io.StringIO(decoded, newline=''), delimiter=delimiter)
    required = {'numero', 'squadra', 'sezione', 'titolo'}
    if not required.issubset(reader.fieldnames or []):
        raise ValueError('Colonne obbligatorie: numero,squadra,sezione,titolo')
    items, seen = [], set()
    for row in reader:
        if None in row:
            raise ValueError('CSV contiene colonne extra')
        number = int(row['numero'].strip())
        if number < 1 or number > 99999 or number in seen:
            raise ValueError(f'Numero invalido/duplicato: {number}')
        seen.add(number)
        fields = {key: (row.get(key) or '').strip() for key in ['squadra', 'sezione', 'titolo', 'sottotitolo', 'tipo']}
        if any(len(value) > 160 for value in fields.values()):
            raise ValueError('Testo oltre 160 caratteri')
        if not all(fields[key] for key in ('squadra', 'sezione', 'titolo')):
            raise ValueError('Squadra, sezione e titolo obbligatori')
        items.append(dict(number=number, team=fields['squadra'], section=fields['sezione'],
                          title=fields['titolo'], subtitle=fields['sottotitolo'],
                          kind=fields['tipo'] or 'Giocatore'))
        if len(items) > 4000:
            raise ValueError('Massimo 4.000 figurine')
    if not items:
        raise ValueError('CSV senza figurine')
    return sorted(items, key=lambda r: r['number'])


def doc_id(team, section, segment):
    data = f'{team}|{section}|{segment}'.encode('utf-8')
    docid = data.hex()
    if len(docid) > 1400:
        h = 0x811c9dc5
        for byte in data:
            h = ((h ^ byte) * 0x01000193) & 0xffffffff
        docid = docid[:1300] + '_' + f'{h:08x}'
    return docid


def group(items):
    groups = defaultdict(list)
    for item in items:
        groups[(item['team'], item['section'])].append(item)
    result = {}
    for (team, section), stickers in groups.items():
        for idx in range(0, len(stickers), 80):
            entry_id = doc_id(team, section, idx // 80)
            result[entry_id] = dict(team=team, section=section, items=stickers[idx:idx+80])
    if len(result) > 400:
        raise ValueError('Più di 400 sezioni: riunisci le figurine in sezioni più grandi')
    return result


def main():
    url = os.environ.get('CATALOG_CSV_URL', '').strip()
    raw_key = os.environ.get('FIREBASE_SERVICE_ACCOUNT', '').strip()
    if not url or not raw_key:
        raise SystemExit('Configurazione non presente: impostare CATALOG_CSV_URL e FIREBASE_SERVICE_ACCOUNT.')
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise SystemExit('CATALOG_CSV_URL deve essere una URL HTTPS pubblica.')
    with urlopen(Request(url, headers={'User-Agent': 'FigurineClubCatalogSync/1.0'}), timeout=25) as stream:
        csv_bytes = stream.read(2_000_001)
    new = group(parse_csv(csv_bytes))
    import firebase_admin
    from firebase_admin import credentials, firestore
    firebase_admin.initialize_app(credentials.Certificate(json.loads(raw_key)))
    db = firestore.client()
    previous = {snap.id: snap.to_dict() for snap in db.collection('catalog').stream()}
    changes = {key: value for key, value in new.items()
               if previous.get(key, {}).get('items') != value['items']
               or previous.get(key, {}).get('team') != value['team']
               or previous.get(key, {}).get('section') != value['section']}
    deletes = set(previous) - set(new)
    print(f'Catalogo: {len(new)} sezioni, {len(changes)} aggiornate, {len(deletes)} eliminate.')
    if not changes and not deletes:
        print('CSV invariato, nessuna scrittura a pagamento/quota.'); return
    operations = [('set', key, value) for key, value in changes.items()] + [('delete', key, None) for key in deletes]
    for i in range(0, len(operations), 350):
        batch = db.batch()
        for action, key, data in operations[i:i+350]:
            ref = db.collection('catalog').document(key)
            if action == 'set':
                batch.set(ref, {**data, 'updatedAt': firestore.SERVER_TIMESTAMP})
            else:
                batch.delete(ref)
        batch.commit()
    print('Catalogo sincronizzato con successo.')


if __name__ == '__main__':
    main()
