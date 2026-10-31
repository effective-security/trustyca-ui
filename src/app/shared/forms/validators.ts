import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** A Go duration: '168h', '30m', '1h30m', '1.5h', '500ms' */
export const GO_DURATION_PATTERN = /^-?(?:\d+(?:\.\d+)?(?:ns|us|µs|μs|ms|s|m|h))+$/;

/** An object identifier in dotted form, at least two arcs, the first 0 to 2 */
export const OID_PATTERN = /^[0-2](?:\.(?:0|[1-9]\d*))+$/;

const PEM_BLOCK =
  /-----BEGIN ([A-Z0-9 ]+)-----\s*([A-Za-z0-9+/=\s]*?)\s*-----END ([A-Z0-9 ]+)-----/g;

export interface PemBlock {
  /** 'CERTIFICATE', 'CERTIFICATE REQUEST', 'PRIVATE KEY', ... */
  readonly type: string;
  /** The base64 body, whitespace removed */
  readonly body: string;
}

/** The PEM blocks of a text, in order; a block whose END does not match its BEGIN is skipped */
export function parsePemBlocks(text: string | null | undefined): PemBlock[] {
  const blocks: PemBlock[] = [];
  for (const m of (text ?? '').matchAll(PEM_BLOCK)) {
    if (m[1] === m[3] && m[2].trim()) {
      blocks.push({ type: m[1], body: m[2].replace(/\s+/g, '') });
    }
  }
  return blocks;
}

function text(control: AbstractControl): string | undefined {
  const v: unknown = control.value;
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/** Valid when empty or a Go duration; error `goDuration` */
export function goDuration(): ValidatorFn {
  return (control): ValidationErrors | null => {
    const v = text(control);
    return v === undefined || GO_DURATION_PATTERN.test(v) ? null : { goDuration: { value: v } };
  };
}

/** Valid when empty or a dotted OID; error `oid` */
export function oid(): ValidatorFn {
  return (control): ValidationErrors | null => {
    const v = text(control);
    return v === undefined || OID_PATTERN.test(v) ? null : { oid: { value: v } };
  };
}

export interface PemOptions {
  /** The block type every block must have, 'CERTIFICATE'; any when omitted */
  readonly type?: string;
  /** True when more than one block is accepted (a chain) */
  readonly multiple?: boolean;
}

/**
 * Valid when empty or made of PEM blocks; error `pem` with `reason`:
 * 'missing' (no block), 'type' (another block type), 'multiple' (more than
 * one block where one is expected)
 */
export function pem(options: PemOptions = {}): ValidatorFn {
  return (control): ValidationErrors | null => {
    const v = text(control);
    if (v === undefined) {
      return null;
    }
    const blocks = parsePemBlocks(v);
    if (blocks.length === 0) {
      return { pem: { reason: 'missing', expected: options.type } };
    }
    if (options.type && blocks.some((b) => b.type !== options.type)) {
      return { pem: { reason: 'type', expected: options.type } };
    }
    if (!options.multiple && blocks.length > 1) {
      return { pem: { reason: 'multiple', expected: options.type } };
    }
    return null;
  };
}
