const ARM_MODE = "arm";
const THUMB_MODE = "thumb";

const CONDITION_CODES = {
  EQ: 0x0,
  NE: 0x1,
  CS: 0x2,
  CC: 0x3,
  MI: 0x4,
  PL: 0x5,
  VS: 0x6,
  VC: 0x7,
  HI: 0x8,
  LS: 0x9,
  GE: 0xa,
  LT: 0xb,
  GT: 0xc,
  LE: 0xd,
  AL: 0xe,
  "": 0xe,
  HS: 0x2,
  LO: 0x3,
};

const REGISTER_NAMES = {
  R0: 0,
  R1: 1,
  R2: 2,
  R3: 3,
  R4: 4,
  R5: 5,
  R6: 6,
  R7: 7,
  R8: 8,
  R9: 9,
  R10: 10,
  R11: 11,
  R12: 12,
  SP: 13,
  LR: 14,
  PC: 15,
  SL: 10,
  FP: 11,
  IP: 12,
};

const THUMB_ALU_OPCODES = {
  AND: 0x0,
  EOR: 0x1,
  LSL: 0x2,
  LSR: 0x3,
  ASR: 0x4,
  ADC: 0x5,
  SBC: 0x6,
  ROR: 0x7,
  TST: 0x8,
  NEG: 0x9,
  CMP: 0xa,
  CMN: 0xb,
  ORR: 0xc,
  MUL: 0xd,
  BIC: 0xe,
  MVN: 0xf,
};

const THUMB_LOAD_STORE_REG_OPCODES = {
  STR: 0,
  STRH: 1,
  STRB: 2,
  LDRSB: 3,
  LDR: 4,
  LDRH: 5,
  LDRB: 6,
  LDRSH: 7,
};

const ARM_DP_OPCODES = {
  AND: 0x0,
  EOR: 0x1,
  SUB: 0x2,
  RSB: 0x3,
  ADD: 0x4,
  ADC: 0x5,
  SBC: 0x6,
  RSC: 0x7,
  TST: 0x8,
  TEQ: 0x9,
  CMP: 0xa,
  CMN: 0xb,
  ORR: 0xc,
  MOV: 0xd,
  BIC: 0xe,
  MVN: 0xf,
};

const ARM_DP_NO_RESULT = new Set(["TST", "TEQ", "CMP", "CMN"]);
const ARM_DP_NO_RN = new Set(["MOV", "MVN"]);

const ARM_KNOWN_BASE_MNEMONICS = new Set([
  "AND",
  "EOR",
  "SUB",
  "RSB",
  "ADD",
  "ADC",
  "SBC",
  "RSC",
  "TST",
  "TEQ",
  "CMP",
  "CMN",
  "ORR",
  "MOV",
  "BIC",
  "MVN",
  "B",
  "BL",
  "BX",
  "BLX",
  "LDR",
  "STR",
  "LDRB",
  "STRB",
  "LDRT",
  "STRT",
  "LDRBT",
  "STRBT",
  "LDRH",
  "STRH",
  "LDRSB",
  "LDRSH",
  "LDRD",
  "STRD",
  "LDM",
  "STM",
  "LDMIA",
  "STMIA",
  "LDMIB",
  "STMIB",
  "LDMDA",
  "STMDA",
  "LDMDB",
  "STMDB",
  "LDMFA",
  "LDMFD",
  "LDMEA",
  "LDMED",
  "STMFA",
  "STMFD",
  "STMEA",
  "STMED",
  "MUL",
  "MLA",
  "UMULL",
  "UMLAL",
  "SMULL",
  "SMLAL",
  "SWP",
  "SWPB",
  "MRS",
  "MSR",
  "CLZ",
  "SVC",
  "SWI",
  "BKPT",
  "NOP",
]);

// Addressing mode bits [pre, up] for LDM and STM aliases
const LDM_ADDR_MODE = {
  IA: [0, 1],
  FD: [0, 1],
  IB: [1, 1],
  ED: [1, 1],
  DA: [0, 0],
  FA: [0, 0],
  DB: [1, 0],
  EA: [1, 0],
};
const STM_ADDR_MODE = {
  IA: [0, 1],
  EA: [0, 1],
  IB: [1, 1],
  FA: [1, 1],
  DA: [0, 0],
  ED: [0, 0],
  DB: [1, 0],
  FD: [1, 0],
};

const ARM_SHIFT_TYPES = {
  LSL: 0,
  LSR: 1,
  ASR: 2,
  ROR: 3,
  RRX: 3,
};

class AssemblerError {
  constructor(lineNumber, lineText, message) {
    this.lineNumber = lineNumber;
    this.lineText = lineText;
    this.message = message;
  }

  toString() {
    return `Line ${this.lineNumber}: ${this.message}\n  > ${this.lineText}`;
  }
}

class AssemblerState {
  constructor() {
    this.mode = THUMB_MODE;
    this.labels = new Map();
    this.currentOffset = 0;
    this.errors = [];
  }

  setMode(mode) {
    this.mode = mode;
  }
  isThumb() {
    return this.mode === THUMB_MODE;
  }
  recordLabel(name, offset) {
    this.labels.set(name.toUpperCase(), offset);
  }
  resolveLabel(name) {
    return this.labels.get(name.toUpperCase());
  }
  addError(lineNumber, text, msg) {
    this.errors.push(new AssemblerError(lineNumber, text, msg));
  }
  hasErrors() {
    return this.errors.length > 0;
  }
}

class ARMv5TAssembler {
  assemble(source) {
    const state = new AssemblerState();
    const raw = this._splitLines(source);
    const noComments = this._stripComments(raw);
    const labelsSplit = this._splitInlineLabels(noComments);
    const lines = this._normalizeLines(labelsSplit);

    this._firstPass(lines, state);
    if (state.hasErrors())
      return { success: false, errors: state.errors, bytes: [] };

    state.currentOffset = 0;
    state.mode = THUMB_MODE;
    const bytes = this._secondPass(lines, state);

    if (state.hasErrors())
      return { success: false, errors: state.errors, bytes: [] };
    return { success: true, errors: [], bytes };
  }

  _splitLines(source) {
    return source.split("\n");
  }

  _stripComments(lines) {
    return lines.map((line) => {
      let inSingle = false;
      let inDouble = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "'" && !inDouble) inSingle = !inSingle;
        if (ch === '"' && !inSingle) inDouble = !inDouble;
        if (inSingle || inDouble) continue;
        if (ch === ";" || ch === "@") return line.slice(0, i);
        if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
      }
      return line;
    });
  }

  _splitInlineLabels(lines) {
    const out = [];
    for (const line of lines) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)?$/);
      if (match) {
        out.push(match[1] + ":");
        if (match[2] && match[2].trim()) out.push(match[2].trim());
      } else {
        out.push(line);
      }
    }
    return out;
  }

  _normalizeLines(lines) {
    return lines.map((l) => l.trim()).filter((l) => l.length > 0);
  }

  _firstPass(lines, state) {
    let offset = 0;
    for (const line of lines) {
      if (this._isModeDirective(line)) {
        this._applyModeDirective(line, state);
      } else if (this._isLabel(line)) {
        state.recordLabel(line.replace(":", "").trim(), offset);
      } else if (this._isDirective(line)) {
        offset += this._getDirectiveSize(line, state);
      } else {
        offset += state.isThumb() ? this._thumbInstructionSize(line) : 4;
      }
    }
  }

  _secondPass(lines, state) {
    const bytes = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (this._isModeDirective(line)) {
        this._applyModeDirective(line, state);
        continue;
      }
      if (this._isLabel(line)) continue;

      if (this._isDirective(line)) {
        const directiveBytes = this._assembleDirective(line, lineNumber, state);
        for (const b of directiveBytes) bytes.push(b);
        state.currentOffset += directiveBytes.length;
        continue;
      }

      const instructionBytes = state.isThumb()
        ? this._assembleThumb(line, lineNumber, state)
        : this._assembleARM(line, lineNumber, state);

      for (const b of instructionBytes) bytes.push(b);
      state.currentOffset += instructionBytes.length;
    }
    return bytes;
  }

  _isModeDirective(line) {
    const u = line.toUpperCase();
    return u === ".ARM" || u === ".THUMB" || u === "ARM" || u === "THUMB";
  }

  _applyModeDirective(line, state) {
    const u = line.toUpperCase();
    state.setMode(u === ".ARM" || u === "ARM" ? ARM_MODE : THUMB_MODE);
  }

  _isLabel(line) {
    return /^[A-Za-z_][A-Za-z0-9_]*\s*:\s*$/.test(line);
  }

  _isDirective(line) {
    return line.startsWith(".") && !this._isModeDirective(line);
  }

  _getDirectiveSize(line, state) {
    const parts = line.slice(1).split(/\s+/);
    const directive = parts[0].toUpperCase();
    const args = parts.slice(1).join(" ").split(",");

    switch (directive) {
      case "BYTE":
        return args.length;
      case "HWORD":
      case "SHORT":
        return args.length * 2;
      case "WORD":
      case "LONG":
        return args.length * 4;
      case "SPACE":
      case "SKIP":
        return parseInt(args[0]) || 0;
      case "ALIGN":
        return 0;
      default:
        return 0;
    }
  }

  _assembleDirective(line, lineNumber, state) {
    const parts = line.slice(1).split(/\s+/);
    const directive = parts[0].toUpperCase();
    const args = parts
      .slice(1)
      .join(" ")
      .split(",")
      .map((a) => a.trim());
    const bytes = [];

    switch (directive) {
      case "BYTE":
        for (const arg of args)
          bytes.push(this._parseImmediate(arg, lineNumber, line, state) & 0xff);
        break;

      case "HWORD":
      case "SHORT":
        for (const arg of args) {
          const v = this._parseImmediate(arg, lineNumber, line, state);
          bytes.push(v & 0xff, (v >> 8) & 0xff);
        }
        break;

      case "WORD":
      case "LONG":
        for (const arg of args) {
          const v = this._parseImmediate(arg, lineNumber, line, state);
          bytes.push(
            v & 0xff,
            (v >> 8) & 0xff,
            (v >> 16) & 0xff,
            (v >>> 24) & 0xff,
          );
        }
        break;

      case "SPACE":
      case "SKIP": {
        const count = parseInt(args[0]) || 0;
        const fill = args[1] !== undefined ? parseInt(args[1]) & 0xff : 0;
        for (let i = 0; i < count; i++) bytes.push(fill);
        break;
      }

      case "ALIGN":
        break;

      default:
        state.addError(lineNumber, line, `Unknown directive: .${directive}`);
    }

    return bytes;
  }

  _parseImmediate(token, lineNumber, line, state) {
    token = token.trim();
    if (token.startsWith("#")) token = token.slice(1);

    if (/^0[xX][0-9A-Fa-f]+$/.test(token)) return parseInt(token, 16);
    if (/^0[bB][01]+$/.test(token)) return parseInt(token.slice(2), 2);
    if (/^-?\d+$/.test(token)) return parseInt(token, 10);

    const labelAddr = state.resolveLabel(token);
    if (labelAddr !== undefined) return labelAddr;

    const evaluated = this._evaluateExpression(token, state.currentOffset + 4);
    if (evaluated !== null && Number.isFinite(evaluated)) return evaluated | 0;

    state.addError(
      lineNumber,
      line,
      `Cannot parse immediate or label: ${token}`,
    );
    return 0;
  }

  _evaluateExpression(expr, pcValue) {
    // Replace 'pc' with the current PC value, then evaluate simple arithmetic.
    // Only characters that belong in integer arithmetic expressions are allowed
    // through.
    const sanitized = expr.replace(/\bpc\b/gi, `(${pcValue})`);
    if (/[^0-9a-fA-FxXbBoO+\-*/()% \t]/.test(sanitized)) return null;
    try {
      return Function(`"use strict"; return (${sanitized})`)();
    } catch (e) {
      return null;
    }
  }

  _parseRegister(token) {
    token = token.trim().toUpperCase();
    if (token in REGISTER_NAMES) return REGISTER_NAMES[token];
    const m = token.match(/^R(\d+)$/);
    if (m) {
      const n = parseInt(m[1]);
      if (n >= 0 && n <= 15) return n;
    }
    return -1;
  }

  _parseOperandList(str) {
    const operands = [];
    let depth = 0;
    let current = "";
    for (const ch of str) {
      if (ch === "[" || ch === "{") depth++;
      else if (ch === "]" || ch === "}") depth--;
      else if (ch === "," && depth === 0) {
        operands.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    if (current.trim()) operands.push(current.trim());
    return operands;
  }

  _parseMemoryOperand(token, lineNumber, line, state) {
    token = token.trim();
    if (!token.startsWith("[")) return null;

    const closingBracket = token.lastIndexOf("]");
    const inner = token.slice(1, closingBracket);
    const parts = inner.split(",").map((s) => s.trim());

    const rn = this._parseRegister(parts[0]);
    if (rn < 0) return null;

    if (parts.length === 1) return { rn, offset: 0, isImm: true, rm: -1 };

    const isImmOffset = parts[1].startsWith("#") || /^-?\d/.test(parts[1]);
    if (isImmOffset) {
      const offset = this._parseImmediate(parts[1], lineNumber, line, state);
      return { rn, offset, isImm: true, rm: -1 };
    }

    const rm = this._parseRegister(parts[1]);
    if (rm < 0) {
      state.addError(
        lineNumber,
        line,
        `Invalid register in memory operand: ${parts[1]}`,
      );
      return null;
    }
    return { rn, offset: 0, isImm: false, rm };
  }

  _parseRegisterList(token) {
    token = token.trim();
    if (token.startsWith("{")) token = token.slice(1);
    if (token.endsWith("}")) token = token.slice(0, -1);

    const registers = [];
    for (const part of token.split(",")) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [fromStr, toStr] = trimmed.split("-");
        const from = this._parseRegister(fromStr.trim());
        const to = this._parseRegister(toStr.trim());
        for (let r = from; r <= to; r++) registers.push(r);
      } else {
        registers.push(this._parseRegister(trimmed));
      }
    }
    return registers;
  }

  _halfwordToBytes(halfword) {
    return [halfword & 0xff, (halfword >> 8) & 0xff];
  }

  _wordToBytes(word) {
    return [
      word & 0xff,
      (word >> 8) & 0xff,
      (word >> 16) & 0xff,
      (word >>> 24) & 0xff,
    ];
  }

  _resolveBranchTarget(operand, lineNumber, line, state) {
    operand = operand.trim();
    if (operand.startsWith("#")) operand = operand.slice(1);
    if (/^0[xX][0-9A-Fa-f]+$/.test(operand)) return parseInt(operand, 16);
    if (/^-?\d+$/.test(operand)) return parseInt(operand, 10);

    const addr = state.resolveLabel(operand);
    if (addr !== undefined) return addr;

    // Try evaluating as an expression (supports `pc + 2 + 0x3*2` style targets)
    const pc = state.currentOffset + 4;
    const evaluated = this._evaluateExpression(operand, pc);
    if (evaluated !== null && Number.isFinite(evaluated)) return evaluated | 0;

    state.addError(
      lineNumber,
      line,
      `Undefined label or unresolvable expression: ${operand}`,
    );
    return 0;
  }

  _thumbInstructionSize(line) {
    const spaceIdx = line.search(/\s/);
    const mnemonic = (
      spaceIdx === -1 ? line : line.slice(0, spaceIdx)
    ).toUpperCase();

    if (mnemonic === "BL") return 4;

    if (mnemonic === "BLX") {
      const operandStr = spaceIdx === -1 ? "" : line.slice(spaceIdx).trim();
      const firstOperand = operandStr.split(",")[0].trim();
      if (this._parseRegister(firstOperand) >= 0) return 2;
      return 4;
    }

    return 2;
  }

  _assembleThumb(line, lineNumber, state) {
    const spaceIdx = line.search(/\s/);
    const rawMnemonic = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
    const operandStr = spaceIdx === -1 ? "" : line.slice(spaceIdx).trim();
    const mnemonic = rawMnemonic.toUpperCase();
    const operands = this._parseOperandList(operandStr);
    const pc = state.currentOffset + 4;

    // Conditional branches: B<cond> — 2 chars after B, not BL/BLX/BIC/BX
    if (
      mnemonic.length > 1 &&
      mnemonic[0] === "B" &&
      mnemonic !== "BX" &&
      mnemonic !== "BL" &&
      mnemonic !== "BLX" &&
      mnemonic !== "BIC"
    ) {
      const condStr = mnemonic.slice(1);
      if (condStr in CONDITION_CODES && condStr !== "AL" && condStr !== "") {
        return this._thumbBCond(
          CONDITION_CODES[condStr],
          operands,
          lineNumber,
          line,
          state,
          pc,
        );
      }
    }

    switch (mnemonic) {
      case "LSL":
      case "LSR":
      case "ASR":
        return this._thumbShift(mnemonic, operands, lineNumber, line, state);

      case "MOV":
        return this._thumbMOV(operands, lineNumber, line, state);
      case "ADD":
        return this._thumbADD(operands, lineNumber, line, state);
      case "SUB":
        return this._thumbSUB(operands, lineNumber, line, state);
      case "CMP":
        return this._thumbCMP(operands, lineNumber, line, state);

      case "AND":
      case "EOR":
      case "ADC":
      case "SBC":
      case "ROR":
      case "TST":
      case "NEG":
      case "CMN":
      case "ORR":
      case "MUL":
      case "BIC":
      case "MVN":
        return this._thumbALU(mnemonic, operands, lineNumber, line, state);

      case "BX":
        return this._thumbBX(operands, lineNumber, line, state);
      case "BLX":
        return this._thumbBLX(operands, lineNumber, line, state, pc);
      case "BL":
        return this._thumbBL(operands, lineNumber, line, state, pc);
      case "B":
        return this._thumbB(operands, lineNumber, line, state, pc);

      case "LDR":
      case "LDRB":
      case "LDRH":
      case "LDRSB":
      case "LDRSH":
      case "STR":
      case "STRB":
      case "STRH":
        return this._thumbLoadStore(
          mnemonic,
          operands,
          lineNumber,
          line,
          state,
        );

      case "PUSH":
        return this._thumbPUSH(operands, lineNumber, line, state);
      case "POP":
        return this._thumbPOP(operands, lineNumber, line, state);
      case "STMIA":
        return this._thumbSTMIA(operands, lineNumber, line, state);
      case "LDMIA":
        return this._thumbLDMIA(operands, lineNumber, line, state);
      case "SVC":
      case "SWI":
        return this._thumbSVC(operands, lineNumber, line, state);
      case "BKPT":
        return this._thumbBKPT(operands, lineNumber, line, state);
      case "NOP":
        return this._halfwordToBytes(0x46c0); // MOV R8, R8

      default:
        state.addError(lineNumber, line, `Unknown Thumb mnemonic: ${mnemonic}`);
        return [0, 0];
    }
  }

  // LSL/LSR/ASR — format 1 (immediate) or format 4 (register)
  _thumbShift(mnemonic, operands, lineNumber, line, state) {
    const shiftImmOpcodes = { LSL: 0, LSR: 1, ASR: 2 };

    if (operands.length === 3) {
      // LSL Rd, Rs, #imm5
      const rd = this._parseRegister(operands[0]);
      const rs = this._parseRegister(operands[1]);
      const imm = this._parseImmediate(operands[2], lineNumber, line, state);
      if (rd < 0 || rd > 7 || rs < 0 || rs > 7) {
        state.addError(
          lineNumber,
          line,
          `${mnemonic}: registers must be R0-R7`,
        );
        return [0, 0];
      }
      const op = shiftImmOpcodes[mnemonic];
      const amt = imm === 0 && (op === 1 || op === 2) ? 32 : imm;
      return this._halfwordToBytes(
        (op << 11) | ((amt & 0x1f) << 6) | ((rs & 7) << 3) | (rd & 7),
      );
    }

    if (operands.length === 2) {
      // LSL Rd, Rs  — ALU format
      const rd = this._parseRegister(operands[0]);
      const rs = this._parseRegister(operands[1]);
      if (rd < 0 || rd > 7 || rs < 0 || rs > 7) {
        state.addError(
          lineNumber,
          line,
          `${mnemonic}: registers must be R0-R7`,
        );
        return [0, 0];
      }
      const opcode = THUMB_ALU_OPCODES[mnemonic];
      return this._halfwordToBytes(
        0x4000 | (opcode << 6) | ((rs & 7) << 3) | (rd & 7),
      );
    }

    state.addError(lineNumber, line, `${mnemonic}: expected 2 or 3 operands`);
    return [0, 0];
  }

  // MOV Rd, #imm8  or  MOV Rd, Rn (hi-reg)
  _thumbMOV(operands, lineNumber, line, state) {
    if (operands.length < 2) {
      state.addError(lineNumber, line, "MOV: expected 2 operands");
      return [0, 0];
    }
    const rd = this._parseRegister(operands[0]);
    if (rd < 0) {
      state.addError(lineNumber, line, "MOV: invalid destination register");
      return [0, 0];
    }

    const isImm =
      operands[1].trim().startsWith("#") || /^-?\d/.test(operands[1].trim());
    if (isImm) {
      const imm = this._parseImmediate(operands[1], lineNumber, line, state);
      if (rd > 7) {
        state.addError(lineNumber, line, "MOV #imm: register must be R0-R7");
        return [0, 0];
      }
      if (imm < 0 || imm > 255) {
        state.addError(
          lineNumber,
          line,
          `MOV #imm out of range (0-255): ${imm}`,
        );
        return [0, 0];
      }
      return this._halfwordToBytes(0x2000 | ((rd & 7) << 8) | (imm & 0xff));
    }

    const rn = this._parseRegister(operands[1]);
    if (rn < 0) {
      state.addError(lineNumber, line, "MOV: invalid source register");
      return [0, 0];
    }
    const h1 = rd > 7 ? 1 : 0;
    const h2 = rn > 7 ? 1 : 0;
    return this._halfwordToBytes(
      0x4600 | (h1 << 7) | (h2 << 6) | ((rn & 7) << 3) | (rd & 7),
    );
  }

  // ADD — many forms
  _thumbADD(operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);

    // ADD SP, #imm7  (format 13)
    if (rd === 13 && operands.length === 2) {
      const imm = this._parseImmediate(operands[1], lineNumber, line, state);
      if (imm < 0 || imm > 508 || imm % 4 !== 0) {
        state.addError(
          lineNumber,
          line,
          `ADD SP,#imm: immediate must be 0-508 and word-aligned`,
        );
        return [0, 0];
      }
      return this._halfwordToBytes(0xb000 | ((imm >> 2) & 0x7f));
    }

    if (rd < 0) {
      state.addError(lineNumber, line, "ADD: invalid destination register");
      return [0, 0];
    }

    if (operands.length === 3) {
      const rn = this._parseRegister(operands[1]);
      if (rn < 0) {
        state.addError(lineNumber, line, "ADD: invalid second register");
        return [0, 0];
      }

      // ADD Rd, PC, #imm8  (format 12 — PC-relative address)
      if (rn === 15) {
        const imm = this._parseImmediate(operands[2], lineNumber, line, state);
        if (rd > 7 || imm < 0 || imm > 1020 || imm % 4 !== 0) {
          state.addError(
            lineNumber,
            line,
            "ADD Rd,PC,#imm: Rd must be R0-R7, imm 0-1020 word-aligned",
          );
          return [0, 0];
        }
        return this._halfwordToBytes(
          0xa000 | ((rd & 7) << 8) | ((imm >> 2) & 0xff),
        );
      }

      // ADD Rd, SP, #imm8  (format 12 — SP-relative address)
      if (rn === 13) {
        const imm = this._parseImmediate(operands[2], lineNumber, line, state);
        if (rd > 7 || imm < 0 || imm > 1020 || imm % 4 !== 0) {
          state.addError(
            lineNumber,
            line,
            "ADD Rd,SP,#imm: Rd must be R0-R7, imm 0-1020 word-aligned",
          );
          return [0, 0];
        }
        return this._halfwordToBytes(
          0xa800 | ((rd & 7) << 8) | ((imm >> 2) & 0xff),
        );
      }

      const isImmOperand =
        operands[2].trim().startsWith("#") || /^-?\d/.test(operands[2].trim());
      if (isImmOperand) {
        // ADD Rd, Rn, #imm3  (format 2)
        const imm = this._parseImmediate(operands[2], lineNumber, line, state);
        if (rd > 7 || rn > 7) {
          state.addError(
            lineNumber,
            line,
            "ADD Rd,Rn,#imm3: registers must be R0-R7",
          );
          return [0, 0];
        }
        if (imm < 0 || imm > 7) {
          state.addError(
            lineNumber,
            line,
            `ADD #imm3 out of range (0-7): ${imm}`,
          );
          return [0, 0];
        }
        return this._halfwordToBytes(
          0x1c00 | ((imm & 7) << 6) | ((rn & 7) << 3) | (rd & 7),
        );
      }

      // ADD Rd, Rn, Rm  (format 2)
      const rm = this._parseRegister(operands[2]);
      if (rd > 7 || rn > 7 || rm < 0 || rm > 7) {
        state.addError(
          lineNumber,
          line,
          "ADD Rd,Rn,Rm: registers must be R0-R7",
        );
        return [0, 0];
      }
      return this._halfwordToBytes(
        0x1800 | ((rm & 7) << 6) | ((rn & 7) << 3) | (rd & 7),
      );
    }

    if (operands.length === 2) {
      const isImm =
        operands[1].trim().startsWith("#") || /^-?\d/.test(operands[1].trim());
      if (isImm) {
        // ADD Rd, #imm8  (format 3)
        const imm = this._parseImmediate(operands[1], lineNumber, line, state);
        if (rd > 7) {
          state.addError(
            lineNumber,
            line,
            "ADD Rd,#imm8: register must be R0-R7",
          );
          return [0, 0];
        }
        if (imm < 0 || imm > 255) {
          state.addError(
            lineNumber,
            line,
            `ADD #imm8 out of range (0-255): ${imm}`,
          );
          return [0, 0];
        }
        return this._halfwordToBytes(0x3000 | ((rd & 7) << 8) | (imm & 0xff));
      }

      // ADD Rd, Rn  (hi-reg format 5)
      const rn = this._parseRegister(operands[1]);
      if (rn < 0) {
        state.addError(lineNumber, line, "ADD: invalid source register");
        return [0, 0];
      }
      const h1 = rd > 7 ? 1 : 0;
      const h2 = rn > 7 ? 1 : 0;
      return this._halfwordToBytes(
        0x4400 | (h1 << 7) | (h2 << 6) | ((rn & 7) << 3) | (rd & 7),
      );
    }

    state.addError(lineNumber, line, "ADD: invalid operands");
    return [0, 0];
  }

  // SUB — three-operand format 2, two-operand format 3, SP format 13
  _thumbSUB(operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);

    // SUB SP, #imm7  (format 13)
    if (rd === 13 && operands.length === 2) {
      const imm = this._parseImmediate(operands[1], lineNumber, line, state);
      if (imm < 0 || imm > 508 || imm % 4 !== 0) {
        state.addError(
          lineNumber,
          line,
          "SUB SP,#imm: immediate must be 0-508 and word-aligned",
        );
        return [0, 0];
      }
      return this._halfwordToBytes(0xb080 | ((imm >> 2) & 0x7f));
    }

    if (rd < 0) {
      state.addError(lineNumber, line, "SUB: invalid destination register");
      return [0, 0];
    }

    if (operands.length === 3) {
      const rn = this._parseRegister(operands[1]);
      if (rn < 0) {
        state.addError(lineNumber, line, "SUB: invalid second register");
        return [0, 0];
      }

      const isImmOperand =
        operands[2].trim().startsWith("#") || /^-?\d/.test(operands[2].trim());
      if (isImmOperand) {
        // SUB Rd, Rn, #imm3
        const imm = this._parseImmediate(operands[2], lineNumber, line, state);
        if (rd > 7 || rn > 7) {
          state.addError(
            lineNumber,
            line,
            "SUB Rd,Rn,#imm3: registers must be R0-R7",
          );
          return [0, 0];
        }
        if (imm < 0 || imm > 7) {
          state.addError(
            lineNumber,
            line,
            `SUB #imm3 out of range (0-7): ${imm}`,
          );
          return [0, 0];
        }
        return this._halfwordToBytes(
          0x1e00 | ((imm & 7) << 6) | ((rn & 7) << 3) | (rd & 7),
        );
      }

      // SUB Rd, Rn, Rm
      const rm = this._parseRegister(operands[2]);
      if (rd > 7 || rn > 7 || rm < 0 || rm > 7) {
        state.addError(
          lineNumber,
          line,
          "SUB Rd,Rn,Rm: registers must be R0-R7",
        );
        return [0, 0];
      }
      return this._halfwordToBytes(
        0x1a00 | ((rm & 7) << 6) | ((rn & 7) << 3) | (rd & 7),
      );
    }

    if (operands.length === 2) {
      // SUB Rd, #imm8
      const imm = this._parseImmediate(operands[1], lineNumber, line, state);
      if (rd > 7) {
        state.addError(
          lineNumber,
          line,
          "SUB Rd,#imm8: register must be R0-R7",
        );
        return [0, 0];
      }
      if (imm < 0 || imm > 255) {
        state.addError(
          lineNumber,
          line,
          `SUB #imm8 out of range (0-255): ${imm}`,
        );
        return [0, 0];
      }
      return this._halfwordToBytes(0x3800 | ((rd & 7) << 8) | (imm & 0xff));
    }

    state.addError(lineNumber, line, "SUB: invalid operands");
    return [0, 0];
  }

  // CMP Rn, #imm8  or  CMP Rn, Rm (lo ALU or hi-reg)
  _thumbCMP(operands, lineNumber, line, state) {
    if (operands.length < 2) {
      state.addError(lineNumber, line, "CMP: expected 2 operands");
      return [0, 0];
    }
    const rn = this._parseRegister(operands[0]);
    if (rn < 0) {
      state.addError(lineNumber, line, "CMP: invalid register");
      return [0, 0];
    }

    const isImm =
      operands[1].trim().startsWith("#") || /^-?\d/.test(operands[1].trim());
    if (isImm) {
      const imm = this._parseImmediate(operands[1], lineNumber, line, state);
      if (rn > 7) {
        state.addError(lineNumber, line, "CMP #imm: register must be R0-R7");
        return [0, 0];
      }
      if (imm < 0 || imm > 255) {
        state.addError(
          lineNumber,
          line,
          `CMP #imm out of range (0-255): ${imm}`,
        );
        return [0, 0];
      }
      return this._halfwordToBytes(0x2800 | ((rn & 7) << 8) | (imm & 0xff));
    }

    const rm = this._parseRegister(operands[1]);
    if (rm < 0) {
      state.addError(lineNumber, line, "CMP: invalid source register");
      return [0, 0];
    }

    if (rn > 7 || rm > 7) {
      // Hi-reg format 5
      const h1 = rn > 7 ? 1 : 0;
      const h2 = rm > 7 ? 1 : 0;
      return this._halfwordToBytes(
        0x4500 | (h1 << 7) | (h2 << 6) | ((rm & 7) << 3) | (rn & 7),
      );
    }

    // ALU format 4
    return this._halfwordToBytes(
      0x4000 | (THUMB_ALU_OPCODES["CMP"] << 6) | ((rm & 7) << 3) | (rn & 7),
    );
  }

  // ALU ops: AND EOR ADC SBC ROR TST NEG CMN ORR MUL BIC MVN
  _thumbALU(mnemonic, operands, lineNumber, line, state) {
    if (operands.length < 2) {
      state.addError(lineNumber, line, `${mnemonic}: expected 2 operands`);
      return [0, 0];
    }
    const rd = this._parseRegister(operands[0]);
    const rs = this._parseRegister(operands[1]);
    if (rd < 0 || rd > 7 || rs < 0 || rs > 7) {
      state.addError(lineNumber, line, `${mnemonic}: registers must be R0-R7`);
      return [0, 0];
    }
    const opcode = THUMB_ALU_OPCODES[mnemonic];
    return this._halfwordToBytes(
      0x4000 | (opcode << 6) | ((rs & 7) << 3) | (rd & 7),
    );
  }

  // BX Rs
  _thumbBX(operands, lineNumber, line, state) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "BX: expected register");
      return [0, 0];
    }
    const rs = this._parseRegister(operands[0]);
    if (rs < 0) {
      state.addError(lineNumber, line, `BX: invalid register: ${operands[0]}`);
      return [0, 0];
    }
    const h2 = rs > 7 ? 1 : 0;
    return this._halfwordToBytes(0x4700 | (h2 << 6) | ((rs & 7) << 3));
  }

  // BLX Rs  or  BLX label (32-bit)
  _thumbBLX(operands, lineNumber, line, state, pc) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "BLX: expected operand");
      return [0, 0];
    }
    const rs = this._parseRegister(operands[0]);
    if (rs >= 0) {
      const h2 = rs > 7 ? 1 : 0;
      return this._halfwordToBytes(0x4780 | (h2 << 6) | ((rs & 7) << 3));
    }

    // BLX label — 32-bit (switches to ARM)
    const target = this._resolveBranchTarget(
      operands[0],
      lineNumber,
      line,
      state,
    );
    const alignedTarget = target & ~3;
    const offset = alignedTarget - pc;
    if (offset < -(1 << 22) || offset >= 1 << 22) {
      state.addError(
        lineNumber,
        line,
        `BLX label: branch out of range (${offset} bytes)`,
      );
      return [0, 0, 0, 0];
    }
    const upper11 = (offset >> 12) & 0x7ff;
    const lower11 = (offset >> 1) & 0x7ff;
    return [
      ...this._halfwordToBytes(0xf000 | upper11),
      ...this._halfwordToBytes(0xe800 | lower11),
    ];
  }

  // BL label — 32-bit
  _thumbBL(operands, lineNumber, line, state, pc) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "BL: expected label");
      return [0, 0, 0, 0];
    }
    const target = this._resolveBranchTarget(
      operands[0],
      lineNumber,
      line,
      state,
    );
    const offset = target - pc;
    if (offset < -(1 << 22) || offset >= 1 << 22) {
      state.addError(
        lineNumber,
        line,
        `BL: branch out of range (${offset} bytes)`,
      );
      return [0, 0, 0, 0];
    }
    const upper11 = (offset >> 12) & 0x7ff;
    const lower11 = (offset >> 1) & 0x7ff;
    return [
      ...this._halfwordToBytes(0xf000 | upper11),
      ...this._halfwordToBytes(0xf800 | lower11),
    ];
  }

  // B label — unconditional
  _thumbB(operands, lineNumber, line, state, pc) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "B: expected label");
      return [0, 0];
    }
    const target = this._resolveBranchTarget(
      operands[0],
      lineNumber,
      line,
      state,
    );
    const byteOffset = target - pc;
    const halfwordOffset = byteOffset >> 1;
    if (halfwordOffset < -1024 || halfwordOffset > 1023) {
      state.addError(
        lineNumber,
        line,
        `B: branch out of range (${byteOffset} bytes, max ±2048)`,
      );
      return [0, 0];
    }
    return this._halfwordToBytes(0xe000 | (halfwordOffset & 0x7ff));
  }

  // B<cond> label
  _thumbBCond(cond, operands, lineNumber, line, state, pc) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "B<cond>: expected label");
      return [0, 0];
    }
    const target = this._resolveBranchTarget(
      operands[0],
      lineNumber,
      line,
      state,
    );
    const byteOffset = target - pc;
    const halfwordOffset = byteOffset >> 1;
    if (halfwordOffset < -128 || halfwordOffset > 127) {
      state.addError(
        lineNumber,
        line,
        `B<cond>: branch out of range (${byteOffset} bytes, max ±256)`,
      );
      return [0, 0];
    }
    return this._halfwordToBytes(
      0xd000 | ((cond & 0xf) << 8) | (halfwordOffset & 0xff),
    );
  }

  // LDR/STR/LDRB/STRB/LDRH/STRH/LDRSB/LDRSH
  _thumbLoadStore(mnemonic, operands, lineNumber, line, state) {
    if (operands.length < 2) {
      state.addError(lineNumber, line, `${mnemonic}: expected 2 operands`);
      return [0, 0];
    }
    const rd = this._parseRegister(operands[0]);
    if (rd < 0) {
      state.addError(
        lineNumber,
        line,
        `${mnemonic}: invalid destination register`,
      );
      return [0, 0];
    }

    const memOp = this._parseMemoryOperand(
      operands[1],
      lineNumber,
      line,
      state,
    );

    // LDR Rd, label  — PC-relative with no brackets
    if (!memOp && mnemonic === "LDR") {
      const target = this._resolveBranchTarget(
        operands[1],
        lineNumber,
        line,
        state,
      );
      const alignedPC = (state.currentOffset + 4) & ~3;
      const offset = target - alignedPC;
      if (rd > 7 || offset < 0 || offset > 1020 || offset % 4 !== 0) {
        state.addError(
          lineNumber,
          line,
          "LDR Rd,label: Rd must be R0-R7, label must be word-aligned within 1020 bytes",
        );
        return [0, 0];
      }
      return this._halfwordToBytes(
        0x4800 | ((rd & 7) << 8) | ((offset >> 2) & 0xff),
      );
    }

    if (!memOp) {
      state.addError(lineNumber, line, `${mnemonic}: invalid memory operand`);
      return [0, 0];
    }

    const { rn, offset, isImm, rm } = memOp;

    // LDR Rd, [PC, #imm]  — format 6
    if (mnemonic === "LDR" && rn === 15 && isImm) {
      if (rd > 7 || offset < 0 || offset > 1020 || offset % 4 !== 0) {
        state.addError(
          lineNumber,
          line,
          "LDR [PC,#imm]: Rd must be R0-R7, offset 0-1020 word-aligned",
        );
        return [0, 0];
      }
      return this._halfwordToBytes(
        0x4800 | ((rd & 7) << 8) | ((offset >> 2) & 0xff),
      );
    }

    // LDR/STR Rd, [SP, #imm]  — format 11
    if (rn === 13 && isImm && (mnemonic === "LDR" || mnemonic === "STR")) {
      if (rd > 7 || offset < 0 || offset > 1020 || offset % 4 !== 0) {
        state.addError(
          lineNumber,
          line,
          `${mnemonic} [SP,#imm]: Rd must be R0-R7, offset 0-1020 word-aligned`,
        );
        return [0, 0];
      }
      const loadBit = mnemonic === "LDR" ? 1 : 0;
      return this._halfwordToBytes(
        0x9000 | (loadBit << 11) | ((rd & 7) << 8) | ((offset >> 2) & 0xff),
      );
    }

    if (!isImm) {
      // Register offset — format 7/8
      const op = THUMB_LOAD_STORE_REG_OPCODES[mnemonic];
      if (op === undefined) {
        state.addError(
          lineNumber,
          line,
          `${mnemonic}: sign-extended loads require register offset`,
        );
        return [0, 0];
      }
      if (rd > 7 || rn > 7 || rm > 7) {
        state.addError(
          lineNumber,
          line,
          `${mnemonic}: registers must be R0-R7`,
        );
        return [0, 0];
      }
      return this._halfwordToBytes(
        0x5000 | (op << 9) | ((rm & 7) << 6) | ((rn & 7) << 3) | (rd & 7),
      );
    }

    // Immediate offset
    if (rd > 7 || rn > 7) {
      state.addError(lineNumber, line, `${mnemonic}: registers must be R0-R7`);
      return [0, 0];
    }

    switch (mnemonic) {
      case "STR":
      case "LDR": {
        if (offset < 0 || offset > 124 || offset % 4 !== 0) {
          state.addError(
            lineNumber,
            line,
            `${mnemonic}: offset must be 0-124 word-aligned`,
          );
          return [0, 0];
        }
        const loadBit = mnemonic === "LDR" ? 1 : 0;
        return this._halfwordToBytes(
          0x6000 |
            (loadBit << 11) |
            (((offset >> 2) & 0x1f) << 6) |
            ((rn & 7) << 3) |
            (rd & 7),
        );
      }
      case "STRB":
      case "LDRB": {
        if (offset < 0 || offset > 31) {
          state.addError(lineNumber, line, `${mnemonic}: offset must be 0-31`);
          return [0, 0];
        }
        const loadBit = mnemonic === "LDRB" ? 1 : 0;
        return this._halfwordToBytes(
          0x7000 |
            (loadBit << 11) |
            ((offset & 0x1f) << 6) |
            ((rn & 7) << 3) |
            (rd & 7),
        );
      }
      case "STRH":
      case "LDRH": {
        if (offset < 0 || offset > 62 || offset % 2 !== 0) {
          state.addError(
            lineNumber,
            line,
            `${mnemonic}: offset must be 0-62 halfword-aligned`,
          );
          return [0, 0];
        }
        const loadBit = mnemonic === "LDRH" ? 1 : 0;
        return this._halfwordToBytes(
          0x8000 |
            (loadBit << 11) |
            (((offset >> 1) & 0x1f) << 6) |
            ((rn & 7) << 3) |
            (rd & 7),
        );
      }
      default:
        state.addError(
          lineNumber,
          line,
          `${mnemonic}: sign-extended loads need register offset`,
        );
        return [0, 0];
    }
  }

  // PUSH {reglist}  — format 14
  _thumbPUSH(operands, lineNumber, line, state) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "PUSH: expected register list");
      return [0, 0];
    }
    const regs = this._parseRegisterList(operands[0]);
    let mask = 0;
    let hasLR = false;
    for (const reg of regs) {
      if (reg === 14) {
        hasLR = true;
        continue;
      }
      if (reg < 0 || reg > 7) {
        state.addError(lineNumber, line, "PUSH: only R0-R7 and LR allowed");
        return [0, 0];
      }
      mask |= 1 << reg;
    }
    return this._halfwordToBytes(0xb400 | (hasLR ? 0x100 : 0) | mask);
  }

  // POP {reglist}  — format 14
  _thumbPOP(operands, lineNumber, line, state) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "POP: expected register list");
      return [0, 0];
    }
    const regs = this._parseRegisterList(operands[0]);
    let mask = 0;
    let hasPC = false;
    for (const reg of regs) {
      if (reg === 15) {
        hasPC = true;
        continue;
      }
      if (reg < 0 || reg > 7) {
        state.addError(lineNumber, line, "POP: only R0-R7 and PC allowed");
        return [0, 0];
      }
      mask |= 1 << reg;
    }
    return this._halfwordToBytes(0xbc00 | (hasPC ? 0x100 : 0) | mask);
  }

  // STMIA Rn!, {reglist}  — format 15
  _thumbSTMIA(operands, lineNumber, line, state) {
    if (operands.length < 2) {
      state.addError(lineNumber, line, "STMIA: expected Rn!, {reglist}");
      return [0, 0];
    }
    const rn = this._parseRegister(operands[0].replace("!", "").trim());
    const regs = this._parseRegisterList(operands[1]);
    if (rn < 0 || rn > 7) {
      state.addError(lineNumber, line, "STMIA: Rn must be R0-R7");
      return [0, 0];
    }
    let mask = 0;
    for (const reg of regs) {
      if (reg < 0 || reg > 7) {
        state.addError(lineNumber, line, "STMIA: register list must be R0-R7");
        return [0, 0];
      }
      mask |= 1 << reg;
    }
    return this._halfwordToBytes(0xc000 | ((rn & 7) << 8) | mask);
  }

  // LDMIA Rn!, {reglist}  — format 15
  _thumbLDMIA(operands, lineNumber, line, state) {
    if (operands.length < 2) {
      state.addError(lineNumber, line, "LDMIA: expected Rn!, {reglist}");
      return [0, 0];
    }
    const rn = this._parseRegister(operands[0].replace("!", "").trim());
    const regs = this._parseRegisterList(operands[1]);
    if (rn < 0 || rn > 7) {
      state.addError(lineNumber, line, "LDMIA: Rn must be R0-R7");
      return [0, 0];
    }
    let mask = 0;
    for (const reg of regs) {
      if (reg < 0 || reg > 7) {
        state.addError(lineNumber, line, "LDMIA: register list must be R0-R7");
        return [0, 0];
      }
      mask |= 1 << reg;
    }
    return this._halfwordToBytes(0xc800 | ((rn & 7) << 8) | mask);
  }

  // SVC/SWI #imm8
  _thumbSVC(operands, lineNumber, line, state) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "SVC: expected immediate");
      return [0, 0];
    }
    const imm = this._parseImmediate(operands[0], lineNumber, line, state);
    if (imm < 0 || imm > 255) {
      state.addError(
        lineNumber,
        line,
        `SVC: immediate out of range (0-255): ${imm}`,
      );
      return [0, 0];
    }
    return this._halfwordToBytes(0xdf00 | (imm & 0xff));
  }

  // BKPT #imm8
  _thumbBKPT(operands, lineNumber, line, state) {
    if (operands.length < 1) {
      state.addError(lineNumber, line, "BKPT: expected immediate");
      return [0, 0];
    }
    const imm = this._parseImmediate(operands[0], lineNumber, line, state);
    if (imm < 0 || imm > 255) {
      state.addError(
        lineNumber,
        line,
        `BKPT: immediate out of range (0-255): ${imm}`,
      );
      return [0, 0];
    }
    return this._halfwordToBytes(0xbe00 | (imm & 0xff));
  }

  _assembleARM(line, lineNumber, state) {
    const spaceIdx = line.search(/\s/);
    const rawMnemonic = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
    const operandStr = spaceIdx === -1 ? "" : line.slice(spaceIdx).trim();
    const operands = this._parseOperandList(operandStr);

    const { baseMnemonic, cond, setFlags } = this._parseARMMnemonic(
      rawMnemonic.toUpperCase(),
    );
    const pc = state.currentOffset + 8; // ARM PC is 8 ahead

    switch (baseMnemonic) {
      case "AND":
      case "EOR":
      case "SUB":
      case "RSB":
      case "ADD":
      case "ADC":
      case "SBC":
      case "RSC":
      case "TST":
      case "TEQ":
      case "CMP":
      case "CMN":
      case "ORR":
      case "MOV":
      case "BIC":
      case "MVN":
        return this._armDP(
          baseMnemonic,
          cond,
          setFlags,
          operands,
          lineNumber,
          line,
          state,
        );

      case "B":
        return this._armB(false, cond, operands, lineNumber, line, state, pc);
      case "BL":
        return this._armB(true, cond, operands, lineNumber, line, state, pc);
      case "BX":
        return this._armBX(false, cond, operands, lineNumber, line, state);
      case "BLX":
        return this._armBLX(cond, operands, lineNumber, line, state, pc);

      case "LDR":
      case "STR":
      case "LDRB":
      case "STRB":
      case "LDRT":
      case "STRT":
      case "LDRBT":
      case "STRBT":
        return this._armLoadStore(
          baseMnemonic,
          cond,
          operands,
          lineNumber,
          line,
          state,
        );

      case "LDRH":
      case "STRH":
      case "LDRSB":
      case "LDRSH":
      case "LDRD":
      case "STRD":
        return this._armLoadStoreHalf(
          baseMnemonic,
          cond,
          operands,
          lineNumber,
          line,
          state,
        );

      case "LDM":
      case "STM":
      case "LDMIA":
      case "STMIA":
      case "LDMIB":
      case "STMIB":
      case "LDMDA":
      case "STMDA":
      case "LDMDB":
      case "STMDB":
      case "LDMFA":
      case "LDMEA":
      case "LDMFD":
      case "LDMED":
      case "STMFA":
      case "STMEA":
      case "STMFD":
      case "STMED":
        return this._armLDMSTM(
          baseMnemonic,
          cond,
          operands,
          lineNumber,
          line,
          state,
        );

      case "MUL":
        return this._armMUL(cond, setFlags, operands, lineNumber, line, state);
      case "MLA":
        return this._armMLA(cond, setFlags, operands, lineNumber, line, state);
      case "UMULL":
      case "UMLAL":
      case "SMULL":
      case "SMLAL":
        return this._armMULLong(
          baseMnemonic,
          cond,
          setFlags,
          operands,
          lineNumber,
          line,
          state,
        );

      case "SWP":
        return this._armSWP(false, cond, operands, lineNumber, line, state);
      case "SWPB":
        return this._armSWP(true, cond, operands, lineNumber, line, state);

      case "MRS":
        return this._armMRS(cond, operands, lineNumber, line, state);
      case "MSR":
        return this._armMSR(cond, operands, lineNumber, line, state);

      case "CLZ":
        return this._armCLZ(cond, operands, lineNumber, line, state);
      case "SVC":
      case "SWI":
        return this._armSVC(cond, operands, lineNumber, line, state);
      case "BKPT":
        return this._armBKPT(operands, lineNumber, line, state);
      case "NOP":
        return this._wordToBytes(0xe320f000); // MOV R0, R0 canonical NOP

      default:
        state.addError(
          lineNumber,
          line,
          `Unknown ARM mnemonic: ${baseMnemonic}`,
        );
        return [0, 0, 0, 0];
    }
  }

  _parseARMMnemonic(mnemonic) {
    // ARM syntax: BASE[cond][S], e.g. ADDEQS, MOVS, TEQEQ
    // Some mnemonics end in letters that look like condition codes (MOVS→VS,
    // UMLAL→AL), so we validate each candidate against the known mnemonic set.

    const condEntries = Object.entries(CONDITION_CODES).filter(
      ([k]) => k.length === 2,
    );

    // Try BASE + COND + S
    if (mnemonic.endsWith("S")) {
      const withoutS = mnemonic.slice(0, -1);
      for (const [condStr, condCode] of condEntries) {
        if (withoutS.endsWith(condStr)) {
          const base = withoutS.slice(0, -2);
          if (ARM_KNOWN_BASE_MNEMONICS.has(base)) {
            return { baseMnemonic: base, cond: condCode, setFlags: true };
          }
        }
      }
    }

    // Try BASE + COND
    for (const [condStr, condCode] of condEntries) {
      if (mnemonic.endsWith(condStr)) {
        const base = mnemonic.slice(0, -2);
        if (ARM_KNOWN_BASE_MNEMONICS.has(base)) {
          return { baseMnemonic: base, cond: condCode, setFlags: false };
        }
      }
    }

    // Try BASE + S
    if (mnemonic.endsWith("S")) {
      const base = mnemonic.slice(0, -1);
      if (ARM_KNOWN_BASE_MNEMONICS.has(base)) {
        return { baseMnemonic: base, cond: 0xe, setFlags: true };
      }
    }

    // Bare mnemonic
    return { baseMnemonic: mnemonic, cond: 0xe, setFlags: false };
  }

  // Parse operand2 for ARM data processing: register with optional shift, or
  // immediate
  _armParseOp2(token, lineNumber, line, state) {
    token = token.trim();

    if (token.startsWith("#")) {
      // Immediate: try to encode as 8-bit rotated
      const value = this._parseImmediate(token, lineNumber, line, state);
      const encoded = this._encodeARMImmediate(value);
      if (encoded === null) {
        state.addError(
          lineNumber,
          line,
          `Cannot encode immediate 0x${value.toString(16)} as 8-bit rotated`,
        );
        return 0;
      }
      return (1 << 25) | encoded; // I bit + encoded immediate
    }

    // Register [, shift]
    const commaParts = token.split(",");
    const rm = this._parseRegister(commaParts[0].trim());
    if (rm < 0) {
      state.addError(lineNumber, line, `Invalid register: ${commaParts[0]}`);
      return 0;
    }

    if (commaParts.length === 1) return rm & 0xf; // just Rm, LSL #0

    const shiftStr = commaParts.slice(1).join(",").trim().toUpperCase();

    if (shiftStr === "RRX") return (rm & 0xf) | (0x3 << 5); // RRX

    const shiftMatch = shiftStr.match(/^(LSL|LSR|ASR|ROR)\s+(.+)$/);
    if (!shiftMatch) {
      state.addError(lineNumber, line, `Invalid shift: ${shiftStr}`);
      return 0;
    }

    const shiftType = ARM_SHIFT_TYPES[shiftMatch[1]];
    const shiftOperand = shiftMatch[2].trim();

    if (shiftOperand.startsWith("#")) {
      const amt = this._parseImmediate(shiftOperand, lineNumber, line, state);
      return ((amt & 0x1f) << 7) | (shiftType << 5) | (rm & 0xf);
    }

    // Register shift
    const rs = this._parseRegister(shiftOperand);
    if (rs < 0) {
      state.addError(
        lineNumber,
        line,
        `Invalid shift register: ${shiftOperand}`,
      );
      return 0;
    }
    return ((rs & 0xf) << 8) | (shiftType << 5) | (1 << 4) | (rm & 0xf);
  }

  _encodeARMImmediate(value) {
    value = value >>> 0; // treat as unsigned 32-bit
    for (let rot = 0; rot < 32; rot += 2) {
      const rotated = ((value << rot) | (value >>> (32 - rot))) >>> 0;
      if (rotated <= 0xff) return ((rot / 2) << 8) | rotated;
    }
    return null;
  }

  // Data processing instructions
  _armDP(mnemonic, cond, setFlags, operands, lineNumber, line, state) {
    const opcode = ARM_DP_OPCODES[mnemonic];
    const noResult = ARM_DP_NO_RESULT.has(mnemonic);
    const noRn = ARM_DP_NO_RN.has(mnemonic);
    const sBit = setFlags || noResult ? 1 : 0;

    let rd = 0,
      rn = 0,
      op2 = 0;
    let op2Token = "";

    if (noResult) {
      // TST/TEQ/CMP/CMN Rn, Op2 — no Rd
      rn = this._parseRegister(operands[0]);
      op2Token = operands.slice(1).join(",");
    } else if (noRn) {
      // MOV/MVN Rd, Op2 — no Rn
      rd = this._parseRegister(operands[0]);
      op2Token = operands.slice(1).join(",");
    } else {
      // Normal: Rd, Rn, Op2
      rd = this._parseRegister(operands[0]);
      rn = this._parseRegister(operands[1]);
      op2Token = operands.slice(2).join(",");
    }

    if (rd < 0) rd = 0;
    if (rn < 0) rn = 0;

    op2 = this._armParseOp2(op2Token.trim(), lineNumber, line, state);
    const iBit = (op2 >> 25) & 1;
    const op2Bits = op2 & 0xfff;

    const encoding =
      (cond << 28) |
      (iBit << 25) |
      (opcode << 21) |
      (sBit << 20) |
      (rn << 16) |
      (rd << 12) |
      op2Bits;
    return this._wordToBytes(encoding);
  }

  _armAddr(operands, lineNumber, line, state) {
    // Parse [Rn], [Rn, #imm], [Rn, #imm]!, [Rn], #imm, [Rn, Rm, shift]
    const memStr = operands.find((o) => o.trim().startsWith("["));
    if (!memStr) {
      state.addError(lineNumber, line, "Expected memory operand");
      return null;
    }

    const idx = operands.indexOf(memStr);
    const afterMem = operands.slice(idx + 1);

    const memStr2 = memStr.trim();
    const preIndex = memStr2.endsWith("]") || memStr2.endsWith("]!");
    const wb = memStr2.endsWith("!");
    const inner = memStr2.slice(1, memStr2.lastIndexOf("]"));
    const innerParts = inner.split(",").map((s) => s.trim());

    const rn = this._parseRegister(innerParts[0]);
    if (rn < 0) {
      state.addError(lineNumber, line, "Invalid base register");
      return null;
    }

    if (preIndex) {
      // [Rn] or [Rn, offset]!
      if (innerParts.length === 1) {
        return {
          rn,
          pre: true,
          up: true,
          wb,
          isImm: true,
          offset: 0,
          rm: 0,
          shift: 0,
        };
      }
      const offsetStr = innerParts.slice(1).join(",").trim();
      const isNeg = offsetStr.startsWith("#-") || offsetStr.startsWith("-");
      const up = !isNeg;

      if (offsetStr.startsWith("#") || /^-?\d/.test(offsetStr)) {
        const offset = Math.abs(
          this._parseImmediate(offsetStr, lineNumber, line, state),
        );
        return { rn, pre: true, up, wb, isImm: true, offset, rm: 0, shift: 0 };
      }
      const shiftParts = innerParts.slice(1).join(",");
      const rmStr = shiftParts.trim().replace(/^-/, "");
      const op2Bits = this._armParseOp2(rmStr, lineNumber, line, state) & 0xfff;
      return {
        rn,
        pre: true,
        up: !shiftParts.trim().startsWith("-"),
        wb,
        isImm: false,
        offset: 0,
        rm: 0,
        shift: op2Bits,
      };
    }

    // Post-index: [Rn], offset
    if (afterMem.length === 0) {
      return {
        rn,
        pre: false,
        up: true,
        wb: false,
        isImm: true,
        offset: 0,
        rm: 0,
        shift: 0,
      };
    }
    const postOffsetStr = afterMem.join(",").trim();
    const isNeg =
      postOffsetStr.startsWith("#-") || postOffsetStr.startsWith("-");
    const up = !isNeg;
    if (postOffsetStr.startsWith("#") || /^-?\d/.test(postOffsetStr)) {
      const offset = Math.abs(
        this._parseImmediate(postOffsetStr, lineNumber, line, state),
      );
      return {
        rn,
        pre: false,
        up,
        wb: false,
        isImm: true,
        offset,
        rm: 0,
        shift: 0,
      };
    }
    const op2Bits =
      this._armParseOp2(
        postOffsetStr.replace(/^-/, ""),
        lineNumber,
        line,
        state,
      ) & 0xfff;
    return {
      rn,
      pre: false,
      up,
      wb: false,
      isImm: false,
      offset: 0,
      rm: 0,
      shift: op2Bits,
    };
  }

  _armLoadStore(mnemonic, cond, operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);
    if (rd < 0) {
      state.addError(lineNumber, line, `${mnemonic}: invalid Rd`);
      return [0, 0, 0, 0];
    }

    const addr = this._armAddr(operands, lineNumber, line, state);
    if (!addr) return [0, 0, 0, 0];

    const isByteAccess = mnemonic.includes("B");
    const isLoad = mnemonic.startsWith("L");
    const isT = mnemonic.endsWith("T");

    const preBit = addr.pre ? 1 : 0;
    const upBit = addr.up ? 1 : 0;
    const bBit = isByteAccess ? 1 : 0;
    const wBit = addr.wb ? 1 : 0;
    const lBit = isLoad ? 1 : 0;
    const tBit = isT ? 1 : 0;

    // T-bit instructions use post-index with W=1
    const wFinal = isT && !addr.pre ? 1 : wBit;

    let iBit = addr.isImm ? 0 : 1;
    let offsetBits = addr.isImm ? addr.offset & 0xfff : addr.shift & 0xfff;

    const encoding =
      (cond << 28) |
      (1 << 26) |
      (iBit << 25) |
      (preBit << 24) |
      (upBit << 23) |
      (bBit << 22) |
      (wFinal << 21) |
      (lBit << 20) |
      (addr.rn << 16) |
      (rd << 12) |
      offsetBits;
    return this._wordToBytes(encoding);
  }

  _armLoadStoreHalf(mnemonic, cond, operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);
    if (rd < 0) {
      state.addError(lineNumber, line, `${mnemonic}: invalid Rd`);
      return [0, 0, 0, 0];
    }

    const addr = this._armAddr(operands, lineNumber, line, state);
    if (!addr) return [0, 0, 0, 0];

    const opMap = { STRH: 1, LDRH: 1, LDRSB: 2, LDRSH: 3, LDRD: 2, STRD: 3 };
    const isLoad =
      mnemonic.startsWith("L") || mnemonic === "LDRSB" || mnemonic === "LDRSH";
    const sh =
      mnemonic === "STRH" || mnemonic === "LDRH"
        ? 1
        : mnemonic === "LDRSB"
          ? 2
          : 3;

    let sBit = sh >= 2 ? 1 : 0;
    let hBit = sh === 1 || sh === 3 ? 1 : 0;

    const preBit = addr.pre ? 1 : 0;
    const upBit = addr.up ? 1 : 0;
    const lBit = isLoad ? 1 : 0;
    const wBit = addr.wb ? 1 : 0;

    let immBit, offsetBits;
    if (addr.isImm) {
      immBit = 1;
      offsetBits = ((addr.offset >> 4) << 8) | (addr.offset & 0xf);
    } else {
      immBit = 0;
      offsetBits = addr.shift & 0xf; // just Rm
    }

    const encoding =
      (cond << 28) |
      (preBit << 24) |
      (upBit << 23) |
      (immBit << 22) |
      (wBit << 21) |
      (lBit << 20) |
      (addr.rn << 16) |
      (rd << 12) |
      (offsetBits & 0xf00) |
      (1 << 7) |
      (sBit << 6) |
      (hBit << 5) |
      (1 << 4) |
      (offsetBits & 0xf);
    return this._wordToBytes(encoding);
  }

  _armLDMSTM(mnemonic, cond, operands, lineNumber, line, state) {
    const isLoad = mnemonic.startsWith("L");
    const suffix = mnemonic.slice(3); // chars after LDM / STM
    const amTable = isLoad ? LDM_ADDR_MODE : STM_ADDR_MODE;
    const [preBit, upBit] = amTable[suffix] ?? [0, 1]; // default IA

    const rnStr = operands[0].replace("!", "").trim();
    const rn = this._parseRegister(rnStr);
    const wb = operands[0].includes("!");
    const regs = this._parseRegisterList(operands[1]);
    const forceUser = operands[1] && operands[1].trim().endsWith("^");

    let regMask = 0;
    for (const r of regs) regMask |= 1 << r;

    const encoding =
      (cond << 28) |
      (1 << 27) |
      (preBit << 24) |
      (upBit << 23) |
      (forceUser ? 1 << 22 : 0) |
      (wb ? 1 << 21 : 0) |
      (isLoad ? 1 << 20 : 0) |
      (rn << 16) |
      (regMask & 0xffff);
    return this._wordToBytes(encoding);
  }

  _armB(link, cond, operands, lineNumber, line, state, pc) {
    const target = this._resolveBranchTarget(
      operands[0],
      lineNumber,
      line,
      state,
    );
    const offset = (target - pc) >> 2; // in words
    const encoding =
      (cond << 28) | (0b101 << 25) | (link ? 1 << 24 : 0) | (offset & 0xffffff);
    return this._wordToBytes(encoding);
  }

  _armBX(link, cond, operands, lineNumber, line, state) {
    const rm = this._parseRegister(operands[0]);
    if (rm < 0) {
      state.addError(lineNumber, line, `BX: invalid register`);
      return [0, 0, 0, 0];
    }
    const subOpcode = link ? 0x3 : 0x1;
    const encoding = (cond << 28) | 0x12fff00 | (subOpcode << 4) | (rm & 0xf);
    return this._wordToBytes(encoding);
  }

  _armBLX(cond, operands, lineNumber, line, state, pc) {
    const rm = this._parseRegister(operands[0]);
    if (rm >= 0)
      return this._armBX(true, cond, operands, lineNumber, line, state);

    // BLX label (unconditional, cond bits encode H offset)
    const target = this._resolveBranchTarget(
      operands[0],
      lineNumber,
      line,
      state,
    );
    const offset = target - pc;
    const hBit = (offset >> 1) & 1;
    const wordOffset = (offset >> 2) & 0xffffff;
    const encoding = 0xfa000000 | (hBit << 24) | wordOffset;
    return this._wordToBytes(encoding);
  }

  _armMUL(cond, setFlags, operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);
    const rm = this._parseRegister(operands[1]);
    const rs = this._parseRegister(operands[2]);
    const sBit = setFlags ? 1 : 0;
    const encoding =
      (cond << 28) | (sBit << 20) | (rd << 16) | (rs << 8) | (0x9 << 4) | rm;
    return this._wordToBytes(encoding);
  }

  _armMLA(cond, setFlags, operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);
    const rm = this._parseRegister(operands[1]);
    const rs = this._parseRegister(operands[2]);
    const rn = this._parseRegister(operands[3]);
    const sBit = setFlags ? 1 : 0;
    const encoding =
      (cond << 28) |
      (1 << 21) |
      (sBit << 20) |
      (rd << 16) |
      (rn << 12) |
      (rs << 8) |
      (0x9 << 4) |
      rm;
    return this._wordToBytes(encoding);
  }

  _armMULLong(mnemonic, cond, setFlags, operands, lineNumber, line, state) {
    const rdLo = this._parseRegister(operands[0]);
    const rdHi = this._parseRegister(operands[1]);
    const rm = this._parseRegister(operands[2]);
    const rs = this._parseRegister(operands[3]);
    const sBit = setFlags ? 1 : 0;
    const uBit = mnemonic.startsWith("U") ? 0 : 1; // U=unsigned=0, S=signed=1
    const accBit = mnemonic.includes("MLAL") ? 1 : 0;
    const encoding =
      (cond << 28) |
      (1 << 23) |
      (uBit << 22) |
      (accBit << 21) |
      (sBit << 20) |
      (rdHi << 16) |
      (rdLo << 12) |
      (rs << 8) |
      (0x9 << 4) |
      rm;
    return this._wordToBytes(encoding);
  }

  _armSWP(isByte, cond, operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);
    const rm = this._parseRegister(operands[1]);
    const rnStr = operands[2]
      ? operands[2].replace(/[\[\]]/g, "")
      : operands[1];
    const rn = this._parseRegister(rnStr);
    const encoding =
      (cond << 28) |
      (0x1 << 24) |
      (isByte ? 1 << 22 : 0) |
      (rn << 16) |
      (rd << 12) |
      (0x9 << 4) |
      rm;
    return this._wordToBytes(encoding);
  }

  _armMRS(cond, operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);
    const spsr = operands[1].toUpperCase().includes("SPSR") ? 1 : 0;
    const encoding = (cond << 28) | 0x10f0000 | (spsr << 22) | (rd << 12);
    return this._wordToBytes(encoding);
  }

  _armMSR(cond, operands, lineNumber, line, state) {
    const dest = operands[0].toUpperCase();
    const spsr = dest.includes("SPSR") ? 1 : 0;
    const fields = dest.split("_")[1] || "CXSF";
    let fm = 0;
    if (fields.includes("C")) fm |= 1;
    if (fields.includes("X")) fm |= 2;
    if (fields.includes("S")) fm |= 4;
    if (fields.includes("F")) fm |= 8;

    const srcToken = operands[1].trim();
    if (srcToken.startsWith("#")) {
      const value = this._parseImmediate(srcToken, lineNumber, line, state);
      const encoded = this._encodeARMImmediate(value);
      if (encoded === null) {
        state.addError(lineNumber, line, `MSR: cannot encode immediate`);
        return [0, 0, 0, 0];
      }
      const encoding =
        (cond << 28) |
        (0x1 << 25) |
        (0x1 << 24) |
        (spsr << 22) |
        (0x1 << 21) |
        (fm << 16) |
        (0xf << 12) |
        encoded;
      return this._wordToBytes(encoding);
    }
    const rm = this._parseRegister(srcToken);
    const encoding =
      (cond << 28) |
      (0x1 << 24) |
      (spsr << 22) |
      (0x1 << 21) |
      (fm << 16) |
      (0xf << 12) |
      (rm & 0xf);
    return this._wordToBytes(encoding);
  }

  _armCLZ(cond, operands, lineNumber, line, state) {
    const rd = this._parseRegister(operands[0]);
    const rm = this._parseRegister(operands[1]);
    const encoding = (cond << 28) | 0x16f0f10 | (rd << 12) | (rm & 0xf);
    return this._wordToBytes(encoding);
  }

  _armSVC(cond, operands, lineNumber, line, state) {
    const imm = this._parseImmediate(operands[0], lineNumber, line, state);
    const encoding = (cond << 28) | (0xf << 24) | (imm & 0xffffff);
    return this._wordToBytes(encoding);
  }

  _armBKPT(operands, lineNumber, line, state) {
    const imm = this._parseImmediate(operands[0], lineNumber, line, state);
    const encoding = 0xe1200070 | (((imm >> 4) & 0xfff) << 8) | (imm & 0xf);
    return this._wordToBytes(encoding);
  }
}
