/**
 * Decimal exato mínimo (BigInt + escala) para conferências determinísticas.
 * Nunca usa ponto flutuante nas operações das regras.
 */
export class Dec {
  constructor(readonly int: bigint, readonly scale: number) {}

  /** Aceita "2059.4621", "-0.0020", "10". */
  static parse(s: string): Dec {
    const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s.trim());
    if (!m) throw new Error(`Número inválido: ${s}`);
    const frac = m[3] ?? '';
    const int = BigInt(m[2] + frac) * (m[1] === '-' ? -1n : 1n);
    return new Dec(int, frac.length);
  }

  /** Converte notação brasileira "2.059,4621" → Dec. */
  static fromBR(raw: string): Dec {
    if (!/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^\d+(?:,\d+)?$/.test(raw)) throw new Error(`Número BR inválido: ${raw}`);
    return Dec.parse(raw.replace(/\./g, '').replace(',', '.'));
  }

  private align(o: Dec): [bigint, bigint, number] {
    const s = Math.max(this.scale, o.scale);
    return [this.int * 10n ** BigInt(s - this.scale), o.int * 10n ** BigInt(s - o.scale), s];
  }
  add(o: Dec) { const [a, b, s] = this.align(o); return new Dec(a + b, s); }
  sub(o: Dec) { const [a, b, s] = this.align(o); return new Dec(a - b, s); }
  mul(o: Dec) { return new Dec(this.int * o.int, this.scale + o.scale); }
  abs() { return new Dec(this.int < 0n ? -this.int : this.int, this.scale); }
  cmp(o: Dec) { const [a, b] = this.align(o); return a === b ? 0 : a < b ? -1 : 1; }
  eq(o: Dec) { return this.cmp(o) === 0; }

  toString(): string {
    const neg = this.int < 0n;
    let digits = (neg ? -this.int : this.int).toString();
    if (this.scale === 0) return (neg ? '-' : '') + digits;
    digits = digits.padStart(this.scale + 1, '0');
    const i = digits.slice(0, digits.length - this.scale);
    let f = digits.slice(digits.length - this.scale).replace(/0+$/, '');
    return (neg ? '-' : '') + i + (f ? '.' + f : '');
  }

  /** Formato BR com casas fixas (só para exibição). */
  toBR(places = 4): string {
    const neg = this.int < 0n;
    let v = this.abs();
    // arredonda meia-unidade para cima em magnitude
    if (v.scale > places) {
      const div = 10n ** BigInt(v.scale - places);
      v = new Dec((v.int + div / 2n) / div, places);
    } else v = new Dec(v.int * 10n ** BigInt(places - v.scale), places);
    const d = v.int.toString().padStart(places + 1, '0');
    const ip = d.slice(0, d.length - places).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const fp = d.slice(d.length - places);
    return (neg && v.int !== 0n ? '-' : '') + ip + (places ? ',' + fp : '');
  }
}

export const sumDec = (xs: Dec[]) => xs.reduce((a, b) => a.add(b), new Dec(0n, 0));
