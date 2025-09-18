const game = document.querySelector('.game');
var arrFactory = [];
var arrTree = [];
var newFactory;
var interval = 400; // velocidad por defecto (normal)
const TOTAL_CELLS = 30;
let hasEnded = false;
// Estado expuesto para panel
window.HUESITOS_STATE = { trees: 0, factories: 0, running: false };
//var counter = 1;

function createGame() {
    for (let i = 0; i < TOTAL_CELLS; i++) {
        let a = document.querySelector('.game');
        let b = document.createElement('div');
        b.classList.add('box');
        b.setAttribute('data-value', i);
        a.appendChild(b);   
    }
    
}

// (Aviso retirado por solicitud)

function checkEndStates() {
    if (hasEnded) return;
    // Victoria: todas las casillas son árbol y ninguna es fábrica
    if (arrTree.length === TOTAL_CELLS && arrFactory.length === 0) {
        hasEnded = true;
        clearInterval(newFactory);
        window.HUESITOS_STATE.running = false;
        if (typeof window.showWinModal === 'function') {
            try { window.showWinModal(); } catch(e){}
        }
        return;
    }
    // Derrota: todas son fábrica
    if (arrFactory.length === TOTAL_CELLS) {
        hasEnded = true;
        clearInterval(newFactory);
        window.HUESITOS_STATE.running = false;
        if (typeof window.showGameOverModal === 'function') {
            try { window.showGameOverModal(); } catch(e){}
        }
    }
}

function replay() {
    var replay = document.querySelector('.replay');
    replay.addEventListener('click', function() {
        box.forEach(function(box) {
            box.classList.remove('green');
            box.classList.remove('tree');

        });
        //counter += 1;
        //document.querySelector('.counter').innerHTML = 'Level: ' + counter;
        document.querySelector('.hidden').classList.add('levelUp')
        let bang = document.querySelector('.won');
        newFactory = setInterval(randomFactory, 600);
        bang.style.animation = 'start .6s ease-in-out';
        bang.style.top = '100%';
    });
}

function addTree(e) {
    let c = e.target;
    
    if(arrTree.indexOf(c.dataset.value) == -1) {
        arrTree.push(c.dataset.value);
        window.HUESITOS_STATE.trees = arrTree.length;
        // Aún no hemos quitado posible marca de fábrica; comprobamos al final
    } 
    

    if(arrFactory.indexOf(c.dataset.value) != -1) {
        arrFactory.splice(arrFactory.indexOf(c.dataset.value) ,1);
        window.HUESITOS_STATE.factories = arrFactory.length;
    }
    c.classList.remove('red');
    c.classList.remove('factory');
    c.classList.add('green');
    c.classList.add('tree');
    console.log(arrTree);
    // Comprobar estados de fin tras actualizar ambos arrays
    checkEndStates();
}

function randomFactory() {
    let e = Math.random() * 30;
    let g = Math.floor(e);
    
  if(arrFactory.indexOf(box[g].dataset.value) == -1) {
      arrFactory.push(box[g].dataset.value);
      box[g].classList.add('red');
      box[g].classList.remove('green');
      box[g].classList.add('factory');
      // Si había overlay de clic (bongo2), eliminarlo para que quede solo la imagen roja
      try {
        const ov = box[g].querySelector('.click-overlay');
        if (ov) ov.remove();
      } catch(e){}
      window.HUESITOS_STATE.factories = arrFactory.length;
        // Si este robo era un árbol previamente plantado, notificar
        if (arrTree.indexOf(box[g].dataset.value) != -1) {
            arrTree.splice(arrTree.indexOf(box[g].dataset.value), 1);
            window.HUESITOS_STATE.trees = arrTree.length;
        }
        checkEndStates();
    } 
    console.log(arrFactory);
}

var yol = document.querySelector('.yolo');

createGame();

var box = document.querySelectorAll('.box');
// console.log(box);
// Arranque: soporte tanto para botón original (.floating) como para #startBtn
function _start() {
    let init = document.querySelector('.init');
    if (init) {
      init.style.animation = 'start .5s ease-in';
      init.style.top = '100%';
    }
    if (newFactory) clearInterval(newFactory);
    newFactory = setInterval(randomFactory, interval);
    window.HUESITOS_STATE.running = true;
}
var startFloating = document.querySelector('.floating');
if (startFloating) {
  startFloating.addEventListener('click', _start);
}
var startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', _start);
}

window.startHuesitos = _start;

box.forEach(function(box) {
    box.addEventListener('click', addTree, false);
}, false);

function fire(e) {
    console.log(e.target);
    let trg = e.target;
    
    const itemDim = this.getBoundingClientRect(),
    itemSize = {
      x: itemDim.right - itemDim.left,
      y: itemDim.bottom - itemDim.top,
    };
    
    if (window.mojs && window.mojs.Burst) {
      let burst = new window.mojs.Burst({
          left: itemDim.left + (itemSize.x/2),
          top: itemDim.top + (itemSize.y/1.7),
          count: 9,
          radius: {50 : 90},
      });
      burst.play();
    }
};


box.forEach(function(box) {
    box.addEventListener('click', fire);
});

// Reset público
window.resetHuesitos = function() {
  // limpiar
  clearInterval(newFactory);
  arrFactory = [];
  arrTree = [];
  hasEnded = false;
  window.HUESITOS_STATE = { trees: 0, factories: 0, running: false };
  document.querySelectorAll('.box').forEach(function(b){
    b.classList.remove('green','tree','red','factory');
  });
  // volver a mostrar init
  const init = document.querySelector('.init');
  if (init) { init.style.top = '10%'; init.style.animation = ''; }
  const won = document.querySelector('.won');
  if (won) { won.style.top = '100%'; won.style.animation = ''; }
  // reiniciar
  setTimeout(_start, 150);
}

// Dificultad: fácil/normal/difícil -> ajusta el intervalo de aparición
const DIFF_MAP = { easy: 650, normal: 400, hard: 250 };
window.setHuesitosDifficulty = function(level) {
  const ms = DIFF_MAP[level] || DIFF_MAP.normal;
  interval = ms;
  if (window.HUESITOS_STATE.running) {
    clearInterval(newFactory);
    newFactory = setInterval(randomFactory, interval);
  }
};
