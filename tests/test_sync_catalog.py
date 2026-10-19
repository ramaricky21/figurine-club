"""Test locali con Python stdlib, senza Firebase Admin SDK né rete."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from sync_catalog import parse_csv, doc_id, group

class ImportTests(unittest.TestCase):
    def test_csv_with_quotes_and_bom(self):
        rows=parse_csv('\ufeffnumero,squadra,sezione,titolo,sottotitolo,tipo\n1,Juventus,Giocatori,"Mario, Rossi",Demo,Giocatore'.encode())
        self.assertEqual(rows[0]['title'], 'Mario, Rossi')
    def test_semicolon(self):
        rows=parse_csv(b'numero;squadra;sezione;titolo\n12;Inter;Giocatori;Nome Cognome')
        self.assertEqual(rows[0]['number'],12)
    def test_duplicate(self):
        with self.assertRaisesRegex(ValueError,'duplicato'):
            parse_csv(b'numero,squadra,sezione,titolo\n1,A,B,C\n1,D,E,F')
    def test_group_and_key(self):
        rows=[{'number':i,'team':'Juventus','section':'Giocatori','title':str(i),'subtitle':'','kind':'Giocatore'} for i in range(1,174)]
        self.assertEqual(len(group(rows)),3)
        self.assertEqual(doc_id('Juventus','Giocatori',0),'4a7576656e7475737c47696f6361746f72697c30')
    def test_long_keys(self):
        self.assertLess(len(doc_id('🏟'*160,'🔴'*160,0)),1500)
if __name__ == '__main__':unittest.main()
