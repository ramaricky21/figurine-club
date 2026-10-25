/* Immagini associate agli ID immutabili del catalogo Figurine Club.
 * Le figurine composte (Serie BKT/C) sono immagini unificate con parti A/B/C/D.
 * Nessuna modifica ai dati personali o al catalogo Firebase.
 */
export const STICKER_IMAGE_IDS = Object.freeze([
  "4", "12", "14", "15", "18", "22", "23", "38", "39", "40", "49", "56",
  "58", "60", "74", "84", "87", "96", "97", "102", "104", "106", "110", "111",
  "115", "124", "126", "128", "132", "134", "151", "152", "160", "166", "170", "173",
  "175", "209", "213", "215", "219", "225", "236", "237", "242", "244", "247", "251",
  "264", "266", "291", "294", "310", "311", "322", "327", "331", "342", "349", "351",
  "352", "353", "357", "378", "380", "385", "396", "399", "402", "412", "425", "426",
  "428", "429", "441", "454", "456", "473", "479", "492", "501", "509", "510", "513",
  "514", "516", "541", "542", "544", "545", "550", "551", "555", "556", "557", "567",
  "576", "580", "584", "588", "Kit10", "Kit11", "Kit17", "Kit6", "Kit7", "Kit9"
]);
export const STICKER_LANDSCAPE_IMAGE_IDS = Object.freeze([
  "509", "510", "513", "514", "516", "542", "545", "551", "555", "557", "567", "576"
]);
export const STICKER_IMAGES = Object.freeze(Object.fromEntries(
  STICKER_IMAGE_IDS.map(id => [id, `./assets/stickers/${id}.webp`])
));
