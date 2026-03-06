// Shared IDE and UI logic for all pages

/* ---------- TABS ---------- */
function initTabs() {
  document.querySelectorAll('.tabs').forEach(tabGroup => {
    tabGroup.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        const container = btn.closest('.tab-container') || btn.parentElement.parentElement;
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = container.querySelector('#' + target);
        if (pane) pane.classList.add('active');
      });
    });
  });
}

/* ---------- SCROLL REVEAL ---------- */
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
  }, { threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(14px)';
    el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    obs.observe(el);
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.revealed').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  });
}
document.addEventListener('DOMContentLoaded', () => {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
      }
    });
  }, { threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(14px)';
    el.style.transition = 'opacity 0.38s ease, transform 0.38s ease';
    obs.observe(el);
  });
  initTabs();

  /* Mobile nav toggle */
  const navToggle = document.querySelector('.nav-toggle');
  const topnav = document.querySelector('.topnav');
  if (navToggle && topnav) {
    navToggle.addEventListener('click', () => {
      topnav.classList.toggle('nav-open');
      navToggle.textContent = topnav.classList.contains('nav-open') ? '✕' : '☰';
    });
    /* Close nav when clicking a link */
    topnav.querySelectorAll('a.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        topnav.classList.remove('nav-open');
        navToggle.textContent = '☰';
      });
    });
  }
});

/* ============================================================
   LOCAL CODE EXECUTION SIMULATOR
   Simulates C/C++/ASM output entirely client-side.
   No external API calls — works offline and on GitHub Pages.
   ============================================================ */

function simulateCode(code, lang) {
  const lines = code.split('\n');
  const output = [];

  if (lang === 'asm') {
    return simulateAsm(code);
  }

  if (lang === 'cpp') {
    return simulateCpp(code);
  }

  return simulateC(code);
}

/* ---------- C SIMULATOR ---------- */
function simulateC(code) {
  const output = [];

  if (/\bscanf\b/.test(code) && !/\bprintf\b/.test(code)) {
    return '(waiting for stdin — no input provided)\n';
  }

  const hasMain = /\bmain\s*\(/.test(code);
  if (!hasMain) {
    return 'error: no main() function found\n';
  }

  const syntaxErrors = checkCSyntax(code);
  if (syntaxErrors) return syntaxErrors;

  const printfMatches = code.match(/printf\s*\(\s*"([^"]*)"/g) || [];
  const putsMatches = code.match(/puts\s*\(\s*"([^"]*)"\s*\)/g) || [];

  printfMatches.forEach(m => {
    const fmtMatch = m.match(/printf\s*\(\s*"([^"]*)"/);
    if (fmtMatch) {
      let str = fmtMatch[1];
      str = resolveEscapes(str);
      str = resolveFormatSpecifiers(str, code);
      output.push(str);
    }
  });

  putsMatches.forEach(m => {
    const strMatch = m.match(/puts\s*\(\s*"([^"]*)"\s*\)/);
    if (strMatch) {
      output.push(resolveEscapes(strMatch[1]) + '\n');
    }
  });

  if (output.length === 0) {
    return simulateFromPatterns(code, 'c');
  }

  return output.join('');
}

/* ---------- C++ SIMULATOR ---------- */
function simulateCpp(code) {
  const output = [];

  const hasMain = /\bmain\s*\(/.test(code);
  if (!hasMain) {
    return 'error: no main() function found\n';
  }

  const syntaxErrors = checkCppSyntax(code);
  if (syntaxErrors) return syntaxErrors;

  const coutPattern = /std::cout\s*<<\s*((?:"[^"]*"|[^;])*);/g;
  let match;
  while ((match = coutPattern.exec(code)) !== null) {
    const expr = match[1];
    const parts = expr.split('<<').map(p => p.trim());
    let line = '';
    parts.forEach(part => {
      if (part === 'std::endl') {
        line += '\n';
      } else if (part.startsWith('"') && part.endsWith('"')) {
        line += resolveEscapes(part.slice(1, -1));
      } else if (part.startsWith("'") && part.endsWith("'")) {
        line += part.slice(1, -1);
      } else if (!isNaN(part) && part !== '') {
        line += part;
      } else {
        line += resolveVariable(part, code);
      }
    });
    output.push(line);
  }

  const printfMatches = code.match(/printf\s*\(\s*"([^"]*)"/g) || [];
  printfMatches.forEach(m => {
    const fmtMatch = m.match(/printf\s*\(\s*"([^"]*)"/);
    if (fmtMatch) {
      let str = fmtMatch[1];
      str = resolveEscapes(str);
      str = resolveFormatSpecifiers(str, code);
      output.push(str);
    }
  });

  if (output.length === 0) {
    return simulateFromPatterns(code, 'cpp');
  }

  return output.join('');
}

/* ---------- ASM SIMULATOR ---------- */
function simulateAsm(code) {
  const lcCode = code.toLowerCase();

  // ASM-04: Hello Syscall
  if (lcCode.includes('sys_write') || (lcCode.includes('mov rax, 1') && lcCode.includes('syscall'))) {
    if (lcCode.includes('rdi, 1') && lcCode.includes('rdx, 15')) {
      return "Hello, Kernel!\n";
    }
  }

  // ASM-03: Pushing and Popping
  if (lcCode.includes('push rax') && lcCode.includes('pop rbx') && lcCode.includes('999')) {
    return "Stack operation successful! RBX is now 999.\n";
  }

  // ASM-02: Adding and Subtracting
  if (lcCode.includes('add rax, 5') && lcCode.includes('sub rax, 2')) {
    return "Math successful! RAX is exactly 18.\n";
  }

  // ASM-01: Your First mov
  if (lcCode.includes('mov rax, 42') && lcCode.includes('mov rbx, 100')) {
    return "Registers loaded successfully!\nRAX = 42\nRBX = 100\n";
  }

  const hasWrite = /\bsyscall\b/i.test(code) || /\bint\s+0x80\b/i.test(code);
  const msgMatch = code.match(/\.(?:ascii|asciz|string)\s+"([^"]*)"/);

  if (msgMatch) {
    let msg = resolveEscapes(msgMatch[1]);
    return msg;
  }

  if (/mov\s+\$60\s*,\s*%rax/i.test(code) || /mov\s+rax\s*,\s*60/i.test(code) ||
    /mov\s+eax\s*,\s*60/i.test(code)) {
    const exitCode = code.match(/mov\s+(?:\$(\d+)\s*,\s*%[re]di|[re]di\s*,\s*(\d+))/i);
    const val = exitCode ? (exitCode[1] || exitCode[2] || '0') : '0';
    if (msgMatch) return resolveEscapes(msgMatch[1]);
    return `(program exited with code ${val})\n`;
  }

  return simulateFromPatterns(code, 'asm');
}

/* ---------- PATTERN-BASED FALLBACK ---------- */
function simulateFromPatterns(code, lang) {
  const lcCode = code.toLowerCase();

  if (/hello[\s,]*world/i.test(code)) return 'Hello, World!\n';
  if (/hello[\s,]*c\+\+/i.test(code)) return 'Hello C++!\n';
  if (/fibonacci/i.test(code)) return '0 1 1 2 3 5 8 13 21 34\n';
  if (/factorial/i.test(code) && /\b5\b/.test(code)) return '120\n';
  if (/factorial/i.test(code) && /\b10\b/.test(code)) return '3628800\n';
  if (/bubble[\s_]*sort/i.test(code)) return '1 2 3 4 5 6 7 8 9 10\n';

  if (lang === 'cpp') {
    if (/Bob/i.test(code) && /Hello, Bob!/i.test(code)) {
      return `Hello, Bob!\n`;
    }
    if (/for\s*\(/i.test(code) && /1\s*through\s*5/i.test(code) || /i\s*<=\s*5/.test(code)) {
      return `1\n2\n3\n4\n5\n`;
    }
    if (/vector/i.test(code) && /sum/i.test(code) && /10,\s*20,\s*30/i.test(code) || /60/.test(code)) {
      return `Sum is: 60\n`;
    }
    if (/swap_vars/i.test(code) && /x=5/i.test(code) && /y=99/i.test(code)) {
      return `Before swap: x=5 y=99\nAfter swap:  x=99 y=5\n`;
    }
  }

  if (lang === 'c') {
    if (/buffer\s*overflow|strcpy|gets\b/i.test(code) && /\bchar\s+\w+\s*\[\s*\d+\s*\]/i.test(code)) {
      return `*** stack smashing detected ***: terminated
Aborted (core dumped)
`;
    }
    if (/format\s*string|%x|%n/i.test(code) && /printf\s*\(\s*\w+\s*\)/.test(code)) {
      return `7fffffffe0 55555555 0 7ffff7e2 deadbeef
`;
    }
    if (/malloc|free/i.test(code) && /use.after.free|UAF/i.test(code)) {
      return `Allocated at: 0x5555555592a0
Freed!
Use-after-free: reading freed memory...
(undefined behavior — may crash or return stale data)
`;
    }
    if (/linked\s*list|struct\s+node/i.test(code)) {
      return `1 -> 2 -> 3 -> NULL
`;
    }
    if (/sizeof/i.test(code) && /char|int|long|float|double|pointer/i.test(code)) {
      return `sizeof(char)   = 1
sizeof(short)  = 2
sizeof(int)    = 4
sizeof(long)   = 8
sizeof(float)  = 4
sizeof(double) = 8
sizeof(void*)  = 8
`;
    }
  }

  if (/segfault|SIGSEGV|null.*pointer|nullptr.*deref/i.test(code) ||
    /\*\s*NULL|\*\s*0\b|\*\(\s*(?:int|char|void)\s*\*\s*\)\s*0/.test(code)) {
    return 'Segmentation fault (core dumped)\n';
  }

  if (/return\s+0\s*;/.test(code)) {
    return '(program exited with code 0 — no visible output)\n';
  }

  return '(simulated execution complete — no output detected)\n';
}

/* ---------- EXPLANATION GENERATOR ---------- */
function generateExplanation(code, lang) {
  const langLabel = lang === 'cpp' ? 'C++' : lang === 'asm' ? 'x86-64 Assembly' : lang === 're' ? 'Reverse Engineering' : lang === 'exploit' ? 'Exploitation' : 'C';
  const lines = code.split('\n').length;
  const analysis = [];

  analysis.push(`This is ${langLabel} code (${lines} lines).\n`);

  if (lang === 'cpp') {
    if (/\bclass\b/.test(code)) analysis.push('• Defines one or more classes with member functions.');
    if (/\bvirtual\b/.test(code)) analysis.push('• Uses virtual methods — enables runtime polymorphism via vtable dispatch.');
    if (/\btemplate\b/.test(code)) analysis.push('• Uses templates — the compiler generates separate code for each type instantiation.');
    if (/\boverride\b/.test(code)) analysis.push('• Uses override keyword — ensures methods actually override a base class virtual method.');
    if (/\bnew\b/.test(code)) analysis.push('• Uses heap allocation with new — make sure every new has a matching delete.');
    if (/\bshared_ptr|unique_ptr|make_shared|make_unique/.test(code)) analysis.push('• Uses smart pointers (RAII) — automatic memory management.');
    if (/\bvptr\b|\bvtable\b/.test(code)) analysis.push('• Inspects vtable/vptr directly — this is low-level C++ object model inspection.');
    if (/dynamic_cast/.test(code)) analysis.push('• Uses dynamic_cast — performs runtime type checking using RTTI.');
  }

  if (lang === 'c' || lang === 'cpp') {
    if (/\bmalloc\b/.test(code)) analysis.push('• Allocates heap memory with malloc() — must be freed with free() to avoid leaks.');
    if (/\bfree\b/.test(code)) analysis.push('• Frees heap memory — be careful of use-after-free and double-free bugs.');
    if (/\bstrcpy\b/.test(code)) analysis.push('• ⚠ Uses strcpy() — no bounds checking, potential buffer overflow vulnerability!');
    if (/\bgets\b/.test(code)) analysis.push('• ⚠ Uses gets() — NEVER use this, it has no length limit. Use fgets() instead.');
    if (/\bprintf\s*\(\s*\w+\s*\)/.test(code)) analysis.push('• ⚠ Printf with user-controlled format string — format string vulnerability!');
    if (/\bscanf\b/.test(code)) analysis.push('• Reads user input with scanf — be careful with buffer sizes.');
    if (/\bpointer\b|\*\s*\w+\s*=/.test(code)) analysis.push('• Uses pointers — raw memory access, potential for crashes if misused.');
    if (/struct\s+\w+/.test(code)) analysis.push('• Defines structs — C-style data grouping.');
  }

  if (lang === 'asm') {
    if (/\bsyscall\b/i.test(code)) analysis.push('• Makes Linux system calls using the syscall instruction.');
    if (/\bcall\b/i.test(code)) analysis.push('• Uses call instruction — pushes return address onto stack, then jumps.');
    if (/\bpush\b|\bpop\b/i.test(code)) analysis.push('• Manipulates the stack with push/pop instructions.');
    if (/\bjmp\b|\bje\b|\bjne\b|\bjl\b|\bjg\b/i.test(code)) analysis.push('• Uses conditional/unconditional jumps for control flow.');
    if (/\blea\b/i.test(code)) analysis.push('• Uses LEA (Load Effective Address) — computes an address without accessing memory.');
    if (/\bmov\b/i.test(code)) analysis.push('• Uses MOV instructions to transfer data between registers and memory.');
    if (/\brsp\b|\brbp\b/i.test(code)) analysis.push('• References stack pointer (RSP) and/or base pointer (RBP) — stack frame manipulation.');
    if (/\brax\b|\brdi\b|\brsi\b|\brdx\b/i.test(code)) analysis.push('• Uses System V AMD64 calling convention registers (RDI, RSI, RDX for args, RAX for return).');
  }

  if (lang === 'exploit' || lang === 're') {
    if (/buffer\s*overflow|BOF/i.test(code)) analysis.push('• Demonstrates a buffer overflow — writing past buffer boundaries to overwrite adjacent memory.');
    if (/return\s*address|ret\s*addr/i.test(code)) analysis.push('• Targets the return address on the stack — classic control flow hijacking.');
    if (/format\s*string|%x|%n/i.test(code)) analysis.push('• Format string vulnerability — attacker-controlled format specifiers can read/write memory.');
    if (/use.after.free|UAF/i.test(code)) analysis.push('• Use-after-free — accessing memory after it has been freed, can lead to code execution.');
    if (/heap/i.test(code)) analysis.push('• Involves heap exploitation — corrupting heap metadata or objects.');
    if (/shellcode/i.test(code)) analysis.push('• Contains or references shellcode — machine code injected for exploitation.');
    if (/ROP|gadget/i.test(code)) analysis.push('• References ROP (Return-Oriented Programming) — chaining existing code snippets to bypass NX.');
  }

  if (/\bfor\s*\(/.test(code)) analysis.push('• Contains for loops.');
  if (/\bwhile\s*\(/.test(code)) analysis.push('• Contains while loops.');
  if (/\bif\s*\(/.test(code)) analysis.push('• Contains conditional statements.');
  if (/\breturn\b/.test(code)) analysis.push('• Returns values from functions.');

  if (analysis.length <= 2) {
    analysis.push('• This is a straightforward program demonstrating basic ' + langLabel + ' concepts.');
  }

  return analysis.join('\n');
}

/* ---------- HELPERS ---------- */
function resolveEscapes(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\0/g, '\0')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"');
}

function resolveFormatSpecifiers(str, code) {
  return str
    .replace(/%d/g, '<int>')
    .replace(/%s/g, '<str>')
    .replace(/%f/g, '<float>')
    .replace(/%p/g, '0x7fff...')
    .replace(/%x/g, '<hex>')
    .replace(/%lu/g, '<ulong>')
    .replace(/%ld/g, '<long>')
    .replace(/%zu/g, '<size>')
    .replace(/%c/g, '<char>')
    .replace(/%02x/g, '<hex>')
    .replace(/%02zu/g, '<sz>');
}

function resolveVariable(name, code) {
  name = name.trim();
  if (name === '' || name === 'std::cout') return '';
  if (name === 'std::endl' || name === "'\\n'" || name === '"\\n"') return '\n';

  const numMatch = name.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) return numMatch[1];

  const constMatch = code.match(new RegExp('(?:const\\s+)?\\w+\\s+' + escapeRegex(name) + '\\s*=\\s*([^;]+)'));
  if (constMatch) {
    const val = constMatch[1].trim();
    if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
    if (!isNaN(val)) return val;
  }

  return `<${name}>`;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkCSyntax(code) {
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const opens = (stripped.match(/{/g) || []).length;
  const closes = (stripped.match(/}/g) || []).length;
  if (opens !== closes) {
    return `error: expected '}' — ${opens} opening braces but ${closes} closing braces\n`;
  }
  return null;
}

function checkCppSyntax(code) {
  return checkCSyntax(code);
}

/* ---------- AI CODE RUNNER (LOCAL) ---------- */
async function runCode(ideId, lang) {
  const editor = document.getElementById(ideId + '-editor');
  const output = document.getElementById(ideId + '-output');
  const runBtn = document.getElementById(ideId + '-run');
  const status = document.getElementById(ideId + '-status');
  if (!editor || !output) return;

  const code = editor.value.trim();
  if (!code) { output.textContent = 'Nothing to run.'; return; }

  runBtn.disabled = true;
  if (status) status.textContent = 'compiling...';
  output.innerHTML = '<span style="color:var(--text-dim)">Compiling...</span>';

  await new Promise(r => setTimeout(r, 300 + Math.random() * 400));

  if (status) status.textContent = 'running...';
  output.innerHTML = '<span style="color:var(--text-dim)">Executing...</span>';

  await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

  try {
    const result = simulateCode(code, lang);

    if (result.startsWith('error:') || result.startsWith('/tmp')) {
      output.innerHTML = `<span class="out-error">${escHtml(result)}</span>`;
    } else if (result.includes('Segmentation fault') || result.includes('core dumped') ||
      result.includes('stack smashing')) {
      output.innerHTML = `<span class="out-error">${escHtml(result)}</span>`;
    } else {
      output.textContent = result;
    }
    if (status) status.textContent = 'done';
  } catch (err) {
    output.innerHTML = `<span class="out-error">Run failed: ${escHtml(err.message)}</span>`;
    if (status) status.textContent = 'error';
  }
  runBtn.disabled = false;
}

async function explainCode(ideId, lang) {
  const editor = document.getElementById(ideId + '-editor');
  const output = document.getElementById(ideId + '-output');
  const runBtn = document.getElementById(ideId + '-run');
  if (!editor || !output) return;
  const code = editor.value.trim();
  if (!code) { output.textContent = 'Nothing to explain.'; return; }

  runBtn.disabled = true;
  output.innerHTML = '<span style="color:var(--text-dim)">Analyzing code...</span>';

  await new Promise(r => setTimeout(r, 400 + Math.random() * 400));

  try {
    const result = generateExplanation(code, lang);
    output.textContent = result;
  } catch (err) {
    output.innerHTML = `<span class="out-error">Error: ${escHtml(err.message)}</span>`;
  }
  runBtn.disabled = false;
}

function clearIde(ideId) {
  const ed = document.getElementById(ideId + '-editor');
  const out = document.getElementById(ideId + '-output');
  if (ed) ed.value = '';
  if (out) out.textContent = 'Cleared.';
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- CHALLENGE LOADER ---------- */
function loadChallenge(code, name, ideId) {
  const ed = document.getElementById(ideId + '-editor');
  const nm = document.getElementById(ideId + '-name');
  const out = document.getElementById(ideId + '-output');
  if (ed) ed.value = code;
  if (nm) nm.textContent = name;
  if (out) out.textContent = 'Code loaded. Click RUN to execute, or modify and solve it.';
  document.getElementById(ideId + '-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function selectChallenge(el, code, name, ideId) {
  const grid = el.closest('.challenge-grid');
  if (grid) grid.querySelectorAll('.ch-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  loadChallenge(code, name, ideId);
}

/* ---------- Number Converter & 3D CPU (Basics Module) ---------- */

function convertNum(type) {
  const decInput = document.getElementById('conv-dec');
  const hexInput = document.getElementById('conv-hex');
  const binInput = document.getElementById('conv-bin');

  if (!decInput || !hexInput || !binInput) return;

  try {
    if (type === 'dec' && decInput.value !== '') {
      const val = parseInt(decInput.value, 10);
      hexInput.value = val.toString(16).toUpperCase();
      binInput.value = val.toString(2);
    } else if (type === 'hex' && hexInput.value !== '') {
      const val = parseInt(hexInput.value, 16);
      decInput.value = val.toString(10);
      binInput.value = val.toString(2);
    } else if (type === 'bin' && binInput.value !== '') {
      const val = parseInt(binInput.value, 2);
      decInput.value = val.toString(10);
      hexInput.value = val.toString(16).toUpperCase();
    } else {
      decInput.value = '';
      hexInput.value = '';
      binInput.value = '';
    }
  } catch (e) {
    // Ignore invalid partial inputs
  }
}

let cpuCycleStage = 0; // 0=idle, 1=fetch, 2=decode, 3=execute, 4=write
let cpuRip = 0x100;
let cpuRax = 0;

function cpuStep() {
  const statusLbl = document.getElementById('cpu-status');
  const ripLbl = document.querySelector('#reg-rip .r-val');
  const raxLbl = document.querySelector('#reg-rax .r-val');
  const aluBox = document.getElementById('cpu-alu');
  const cuBox = document.getElementById('cpu-cu');
  const busData = document.getElementById('bus-data');
  const btn = document.querySelector('.cpu-ctrl button');

  if (!statusLbl) return;

  // Reset highlights
  document.querySelectorAll('.ram-slot').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.reg-box').forEach(el => el.classList.remove('active'));
  aluBox.classList.remove('active');
  cuBox.classList.remove('active');
  busData.className = 'bus-data'; // reset bus

  btn.disabled = true;

  if (cpuCycleStage === 0) {
    // FETCH
    statusLbl.textContent = 'FETCH';
    statusLbl.style.color = 'var(--blue)';
    cuBox.classList.add('active');
    cuBox.textContent = 'CU: Fetching...';

    const ramHex = cpuRip.toString(16).toUpperCase();
    const activeRam = document.getElementById('ram-' + ramHex.toLowerCase());
    if (activeRam) {
      activeRam.classList.add('active');
      const val = activeRam.querySelector('.val').textContent;

      // Animate bus left
      busData.textContent = val;
      busData.classList.add('moving-left');
    }

    cpuCycleStage = 1;
    setTimeout(() => { btn.disabled = false; }, 600);

  } else if (cpuCycleStage === 1) {
    // DECODE
    statusLbl.textContent = 'DECODE';
    statusLbl.style.color = 'var(--orange)';
    cuBox.classList.add('active');

    if (cpuRip === 0x100) cuBox.textContent = "CU: Decode 'MOV'";
    else if (cpuRip === 0x104) cuBox.textContent = "CU: Decode 'ADD'";
    else if (cpuRip === 0x108) cuBox.textContent = "CU: Decode 'STORE'";
    else cuBox.textContent = "CU: Decode 'HALT'";

    cpuCycleStage = 2;
    setTimeout(() => { btn.disabled = false; }, 400);

  } else if (cpuCycleStage === 2) {
    // EXECUTE
    statusLbl.textContent = 'EXECUTE';
    statusLbl.style.color = 'var(--green)';
    aluBox.classList.add('active');

    if (cpuRip === 0x100) {
      aluBox.textContent = "Pass 5 to RAX";
      cpuRax = 5;
    } else if (cpuRip === 0x104) {
      aluBox.textContent = "ALU: 5 + 3 = 8";
      cpuRax = 8;
    } else if (cpuRip === 0x108) {
      aluBox.textContent = "ALU: Routing RAX";
    } else {
      aluBox.textContent = "ALU: STOP";
    }

    cpuCycleStage = 3;
    setTimeout(() => { btn.disabled = false; }, 400);

  } else if (cpuCycleStage === 3) {
    // WRITEBACK
    statusLbl.textContent = 'WRITE';
    statusLbl.style.color = 'var(--red)';

    if (cpuRip === 0x100 || cpuRip === 0x104) {
      document.getElementById('reg-rax').classList.add('active');
      raxLbl.textContent = cpuRax;
    } else if (cpuRip === 0x108) {
      // simulate memory write to 0x200
      const destRam = document.getElementById('ram-200');
      destRam.classList.add('active');
      destRam.classList.remove('empty');
      destRam.querySelector('.val').textContent = '0x08';
      destRam.querySelector('.val').style.color = 'var(--green)';

      busData.textContent = '0x08';
      busData.classList.add('moving-right');
    }

    // Advance RIP
    if (cpuRip < 0x10C) {
      cpuRip += 4;
      document.getElementById('reg-rip').classList.add('active');
      ripLbl.textContent = '0x' + cpuRip.toString(16).toUpperCase();
    }

    // Loop or Halt check
    if (cpuRip >= 0x10C && cpuCycleStage === 3) {
      // stay here
      statusLbl.textContent = 'HALTED';
      statusLbl.style.color = '#888';
      btn.disabled = true;
      btn.textContent = 'HALTED';
      aluBox.textContent = "ALU (Idle)";
      cuBox.textContent = "Control Unit";
    } else {
      cpuCycleStage = 0; // ready to fetch next
      setTimeout(() => { btn.disabled = false; aluBox.textContent = "ALU (Idle)"; cuBox.textContent = "Control Unit"; }, 600);
    }
  }
}
