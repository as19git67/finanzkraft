export default class NumberParser {
  constructor(locale) {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    const numerals = [...new Intl.NumberFormat(locale, {useGrouping: false}).format(9876543210)].reverse();
    const index = new Map(numerals.map((d, i) => [d, i]));
    this._group = new RegExp(`[${parts.find(d => d.type === "group").value}]`, "g");
    this._decimal = new RegExp(`[${parts.find(d => d.type === "decimal").value}]`);
    this._numeral = new RegExp(`[${numerals.join("")}]`, "g");
    this._index = d => index.get(d);
  }

  parse(value) {
    if (value == null) {
      return NaN;
    }
    if (NumberParser.isNumber(value)) {
      return value; // return if already a number
    }
    const trimmedValue = (value.trim()
        .replace(this._group, '')
        .replace(this._decimal, '.')
        .replace(this._numeral, this._index));
    return parseFloat(trimmedValue);
  }

  static isNumber(value) {
    return typeof value === 'number' && Number.isNaN(value) === false;
  }
}
