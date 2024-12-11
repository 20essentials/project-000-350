const $ = el => document?.querySelector(el);
const $$ = el => document?.querySelectorAll(el);
const $table = $('table');
const $th = $table.querySelector('thead');
const $tbody = $table.querySelector('tbody');
const $barraFormula = $('.barra-formula');
const times = length => Array.from({ length }, (_, i) => i);
let selectedColumn = null;
let selectedRow = null;

class ExcelTable {
  numberOfRows = 10;
  numberOfCols = 6;
  START_CHAR = 65; //A
  INITIAL_EXCEL_CELLS = {
    0: '=Math.PI',
    1: '=Math.E',
    2: '=Math.SQRT2',
    3: '=Math.LOG2E',
    4: 'Hello',
    5: '=Math.random()'
  };

  STATE = times(this.numberOfRows).map((_, r) =>
    times(this.numberOfCols).map((_, c) => {
      let computedValue =
        r - 2 === c
          ? this.functionComputeValue(this.INITIAL_EXCEL_CELLS[c], '')
          : '';
      let value = r - 2 === c ? this.INITIAL_EXCEL_CELLS[c] : '';
      return { computedValue, value };
    })
  );

  constructor() {
    this.drawTable();
    this.initEvents();
  }

  getCharacter(numChar) {
    return String.fromCharCode(numChar + this.START_CHAR);
  }

  updateCell(x, y, value) {
    const newState = structuredClone(this.STATE);
    const cell = newState[x][y];
    cell.value = value;

    const constants = this.generateCellConstants(newState);
    cell.computedValue = this.functionComputeValue(value, constants);
    newState[x][y] = cell;

    this.computeAllCellsAndConstants(
      newState,
      this.generateCellConstants(newState)
    );
    this.STATE = newState;
    this.drawTbody();
  }

  functionComputeValue(value, constants) {
    if (typeof value === 'number') return value;
    if (!value.startsWith('=')) return value;

    let formula = value.slice(1);

    if (value.startsWith('=') && /[a-z]/.test(formula[0])) return formula;

    let computedValue = null;

    try {
      computedValue = eval(`(() => {
        ${constants}
        return ${formula};
      })()`);
    } catch (error) {
      computedValue = `ERROR: ${error}`;
    }

    return computedValue;
  }

  selectedCellsClean() {
    $$('.selected').forEach(th => th.classList.remove('selected'));

    $$('input.seleccionado').forEach(input =>
      input.classList.remove('seleccionado')
    );
    $$('.joystickOpaco').forEach(joy => joy.classList.remove('joystickOpaco'));
    $$('.selectBg').forEach(inp => inp.classList.remove('selectBg'));
  }

  initEvents() {
    function handleKeyDown(input) {
      input.addEventListener('keydown', e => {
        const { key } = e;
        if (key === 'Enter') {
          e.preventDefault();
          input.blur();
        }
      });
    }

    document.addEventListener('dblclick', e => {
      if (e.target.matches('.celda-excel')) {
        let celdaSpan = e.target;
        let tdPadre = celdaSpan.closest('td');
        let input = e.target.previousElementSibling;
        input.focus();
        input.className = '';
        input.classList.add('dbclick');
        input.maxLength = 1000;
        const end = input.value.length;
        input.setSelectionRange(end, end);

        handleKeyDown(input);
      }
    });

    document.addEventListener('click', e => {
      if (e.target.matches('.celda-excel')) {
        let celdaSpan = e.target;
        let tdPadre = celdaSpan.closest('td');
        let input = e.target.previousElementSibling;
        input.className = '';
        input.classList.add('click');
        input.maxLength = 0;
        input.focus();
        $barraFormula.value = input.value;
        this.selectedCellsClean();

        input.addEventListener(
          'blur',
          e => {
            input.className = 'click seleccionado';
            const { x, y, column, row } = tdPadre.dataset;
            if (this.STATE[x][y].value === input.value) return;
            this.updateCell(x, y, input.value);
            $barraFormula.value = '';
          },
          { once: true }
        );

        handleKeyDown(input);
        return;
      }

      if (e.target.matches('th.thead')) {
        const thCurrent = e.target;
        const indexColumn =
          [...thCurrent.parentElement.querySelectorAll('th')].indexOf(
            thCurrent
          ) + 1;

        selectedColumn = indexColumn - 2;

        if (indexColumn <= 0) return;
        $$('.selected').forEach(th => th.classList.remove('selected'));
        thCurrent.classList.add('selected');
        $$(`tr td:nth-child(${indexColumn})`).forEach(td =>
          td.classList.add('selected')
        );

        return;
      }

      if (e.target.matches('td.column-0')) {
        const tdCurrent = e.target;
        const indexRow = [...$$('td.column-0')].indexOf(tdCurrent) + 1;
        selectedRow = indexRow - 1;
        if (indexRow <= 0) return;
        $$('.selected').forEach(th => th.classList.remove('selected'));
        $$(`tr:nth-child(${indexRow}) td`).forEach(th =>
          th.classList.add('selected')
        );

        return;
      }
    });

    document.addEventListener('mousedown', e => {
      if (e.target.matches('.joystick') && e.button === 0) {
        e.preventDefault();
        let tdPadre = e.target.closest('td');
        if (!tdPadre) return;
        let { x: firstY, y: firstX } = tdPadre.dataset;
        let inputScope = tdPadre.querySelector('input');
        inputScope.classList.add('seleccionado');

        $tbody.addEventListener('mousemove', handleMove);

        function handleMove(e) {
          const x = e.clientX;
          const y = e.clientY;
          const currentElement = document.elementFromPoint(x, y);
          let td = currentElement.closest('td');
          if (!td || td.classList.contains('column-0')) return;
          if (td === tdPadre) return;
          let { x: newY, y: newX } = td.dataset;
          for (let y = Number(firstY); y <= Number(newY); y++) {
            let currentROW = [
              ...[...$tbody.querySelectorAll('tr')][y].querySelectorAll('td')
            ];
            for (let x = Number(firstX) + 1; x <= Number(newX) + 1; x++) {
              if (currentROW[x] === tdPadre) continue;
              currentROW[x]
                .querySelector('input')
                .classList.add('seleccionado');
              currentROW[x].querySelector('input').classList.add('selectBg');
              currentROW[x]
                .querySelector('aside')
                .classList.add('joystickOpaco');
            }
          }
        }

        $tbody.addEventListener('mousemove', handleMove);

        $tbody.addEventListener('mouseup', e => {
          $tbody.removeEventListener('mousemove', handleMove);
        });
      }
    });

    document.addEventListener('keydown', e => {
      const { key } = e;
      if (key === 'Delete' && selectedColumn !== null) {
        times(this.numberOfRows).forEach(row => {
          this.updateCell(row, selectedColumn, '');
        });

        selectedColumn = null;
        this.drawTh();
        this.drawTbody();
        return;
      }
      if (key === 'Delete' && selectedRow !== null) {
        times(this.numberOfCols).forEach(col => {
          this.updateCell(selectedRow, col, '');
        });

        selectedRow = null;
        this.drawTh();
        this.drawTbody();
        return;
      }
      if (key === 'Tab') {
        e.preventDefault();
      }
    });

    document.addEventListener('copy', e => {
      if (selectedColumn !== null) {
        let columnValues = times(this.numberOfRows).map(
          row => this.STATE[row][selectedColumn].computedValue
        );

        e.clipboardData.setData('text/plain', columnValues.join('\n'));
        e.preventDefault();
        selectedColumn = null;
      }
      if (selectedRow !== null) {
        let columnValues = times(this.numberOfCols).map(
          col => this.STATE[selectedRow][col].computedValue
        );

        e.clipboardData.setData('text/plain', columnValues.join('\t'));
        e.preventDefault();
        selectedColumn = null;
      }
    });
  }

  computeAllCellsAndConstants(cell, constants) {
    cell.forEach(row => {
      row.forEach(cell => {
        const computedValue = this.functionComputeValue(cell.value, constants);
        cell.computedValue = computedValue;
      });
    });
  }

  generateCellConstants(state) {
    return state
      .map((row, col) => {
        return row
          .map((cell, y) => {
            const letter = this.getCharacter(y);
            const cellId = `${letter}${col + 1}`;
            let firstLetter = cell.computedValue[0];
            let secondLetter = cell.computedValue[1];
            let valorVariable =
              /^\d/.test(firstLetter) || /^\d/.test(secondLetter)
                ? cell.computedValue
                : `"${cell.computedValue}"`;
            return `const ${cellId} = ${valorVariable}; `;
          })
          .join('\n');
      })
      .join('\n');
  }

  drawTh() {
    let contentTh = `<tr><th class="th-top"><img src="assets/excelSvg.svg" alt="Excel Svg"></th>`;
    times(this.numberOfCols).forEach(col => {
      contentTh += `<th class="thead">${this.getCharacter(col)}</th>`;
    });
    contentTh += '</tr>';

    $th.innerHTML = contentTh;
  }

  drawTbody() {
    let contentTBody = '';
    times(this.numberOfRows).map(row => {
      contentTBody += `<tr><td class="column-0">${row + 1}</td>`;
      times(this.numberOfCols).map(col => {
        let columnLetter = this.getCharacter(col);
        contentTBody += `<td data-column="${columnLetter}" data-row="${
          row + 1
        }" data-x="${row}" data-y="${col}">
          <input spellcheck="false" type="text" value="${
            this.STATE[row][col].value
          }">
          <span class="celda-excel">${
            this.STATE[row][col].computedValue
          }<aside class="joystick"></aside></span>
          
        </td>`;
      });
      contentTBody += '</tr>';
    });

    $tbody.innerHTML = contentTBody;
  }

  drawTable() {
    this.drawTh();
    this.drawTbody();
  }
}

const excelTable = new ExcelTable();
