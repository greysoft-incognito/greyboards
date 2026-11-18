/**
 * Reads CSV as spreadsheets save it: commas, quoted fields with "" for a quote, line breaks
 * inside quotes, and Windows or Unix line endings. A leading byte-order mark is dropped.
 * Semicolon-separated files, as some spreadsheets save them, are read too.
 */
export class Csv {
  static parse(text: string): string[][] {
    const source = text.replace(/^﻿/, '')
    const firstLine = source.split(/\r?\n/, 1)[0] ?? ''
    const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let quoted = false

    for (let index = 0; index < source.length; index++) {
      const char = source[index]!

      if (quoted) {
        if (char === '"' && source[index + 1] === '"') {
          field += '"'
          index++
        } else if (char === '"') {
          quoted = false
        } else {
          field += char
        }

        continue
      }

      if (char === '"' && field === '') quoted = true
      else if (char === separator) {
        row.push(field)
        field = ''
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && source[index + 1] === '\n') index++
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else field += char
    }

    if (field !== '' || row.length) {
      row.push(field)
      rows.push(row)
    }

    return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
  }
}
