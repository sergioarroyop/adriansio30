// Coche - Juego de carreras integrado en index.html
// Extraído de coche.html y adaptado para ejecutarse dentro de #gameWrapper
(function(){
  // Desactivar overlay de stats (no hay contenedor 'fps')
  var stats = { update: function(){} };

  // Canvas y contexto
  var canvas     = Dom.get('canvas');
  var ctx        = canvas.getContext('2d');

  // Ajuste de ruta de imágenes
  window.Game = window.Game || {};
  Game.imagePath = 'car/images/';

  // Constantes/estado principales (idénticos al ejemplo original)
  var fps            = 60;
  var step           = 1/fps;
  var width          = 1024;
  var height         = 768;
  var centrifugal    = 0.3;
  var skySpeed       = 0.001;
  var hillSpeed      = 0.002;
  var treeSpeed      = 0.003;
  var skyOffset      = 0;
  var hillOffset     = 0;
  var treeOffset     = 0;
  var segments       = [];
  var cars           = [];
  var background     = null;
  var sprites        = null;
  var resolution     = null;
  var roadWidth      = 2000;
  var segmentLength  = 200;
  var rumbleLength   = 3;
  var trackLength    = null;
  var lanes          = 3;
  var fieldOfView    = 100;
  var cameraHeight   = 1000;
  var cameraDepth    = null;
  var drawDistance   = 300;
  var playerX        = 0;
  var playerZ        = null;
  var fogDensity     = 5;
  var position       = 0;
  var speed          = 0;
  var maxSpeed       = segmentLength/step;
  var accel          =  maxSpeed/5;
  var breaking       = -maxSpeed;
  var decel          = -maxSpeed/5;
  var offRoadDecel   = -maxSpeed/2;
  var offRoadLimit   =  maxSpeed/4;
  var totalCars      = 200;
  var currentLapTime = 0;
  var lastLapTime    = null;
  var keyLeft        = false;
  var keyRight       = false;
  var keyFaster      = false;
  var keySlower      = false;

  var KEY = { LEFT:37, UP:38, RIGHT:39, DOWN:40, A:65, D:68, W:87, S:83 };

  // HUD helpers (del original)
  var hud = {
    speed:            { value: null, dom: Dom.get('speed_value') },
    current_lap_time: { value: null, dom: Dom.get('current_lap_time_value') },
    last_lap_time:    { value: null, dom: Dom.get('last_lap_time_value') },
    fast_lap_time:    { value: null, dom: Dom.get('fast_lap_time_value') }
  };

  function updateHud(key, value) {
    if (hud[key].value !== value) {
      hud[key].value = value;
      Dom.set(hud[key].dom, value);
    }
  }

  function formatTime(dt) {
    var minutes = Math.floor(dt/60);
    var seconds = Math.floor(dt - (minutes * 60));
    var tenths  = Math.floor(10 * (dt - Math.floor(dt)));
    if (minutes > 0)
      return minutes + ":" + (seconds < 10 ? "0" : "") + seconds + "." + tenths;
    else
      return seconds + "." + tenths;
  }

  // Segment helpers y estructuras
  function lastY() { return (segments.length == 0) ? 0 : segments[segments.length-1].p2.world.y; }
  function addSegment(curve, y) {
    var n = segments.length;
    segments.push({
      index: n,
      p1: { world: { y: lastY(), z: n   * segmentLength }, camera: {}, screen: {} },
      p2: { world: { y: y,       z: (n+1)* segmentLength }, camera: {}, screen: {} },
      curve: curve,
      sprites: [],
      cars: []
    });
  }
  function addRoad(enter, hold, leave, curve, y) {
    var startY   = lastY();
    var endY     = startY + (Util.toInt(y, 0) * segmentLength);
    var n, total = enter + hold + leave;
    for(n = 0 ; n < enter ; n++) addSegment(Util.easeIn(0, curve, n/enter), Util.easeInOut(startY, endY, n/total));
    for(n = 0 ; n < hold  ; n++) addSegment(curve, Util.easeInOut(startY, endY, (enter+n)/total));
    for(n = 0 ; n < leave ; n++) addSegment(Util.easeInOut(curve, 0, n/leave), Util.easeInOut(startY, endY, (enter+hold+n)/total));
  }
  function addStraight(num) { num = num || rumbleLength; addRoad(num, num, num, 0, 0); }
  function addHill(num, height) { num = num || rumbleLength; addRoad(num, num, num, 0, height); }
  function addCurve(num, curve, height) { num = num || rumbleLength; addRoad(num, num, num, curve, height); }

  function resetRoad() {
    segments = [];
    addStraight(25);
    addHill(25, 20);
    addCurve(25, -8, -20);
    addCurve(25, -8, 0);
    addCurve(25, -8, 20);
    addStraight(50);
    addHill(25, -40);
    addCurve(25, 8, 0);
    addCurve(25, 8, 20);
    addCurve(25, 8, -20);
    addStraight(25);
    resetSprites();
    resetCars();
    segments[findSegment(playerZ).index + 2].color = 'start';
    segments[findSegment(playerZ).index + 3].color = 'start';
    segments[findSegment(playerZ).index + 4].color = 'start';
    segments[segments.length-1].color = 'finish';
  }

  // Sprites/cars (simplificados del original)
  var SPRITES = {
    SCALE: 0.3,
    PALM_TREE:  { x: 5,  y: 5,  w: 5,  h: 5 },
    BILLBOARD01:{ x: 5,  y: 5,  w: 5,  h: 5 },
    PLAYER_STRAIGHT: { w: 80, h: 41 }
  };

  function addSprite(n, sprite, offset) {
    segments[n].sprites.push({ source: sprite, offset: offset });
  }

  function resetSprites() {
    var n;
    for(n = 10; n < segments.length; n += 50) {
      addSprite(n, SPRITES.PALM_TREE, 1);
      addSprite(n, SPRITES.BILLBOARD01, -1);
    }
  }

  function resetCars() {
    cars = [];
    for (var n = 0; n < totalCars; n++) {
      var offset = Math.random() * Util.randomChoice([-0.8, -0.4, 0.4, 0.8]);
      var z = Math.floor(Math.random() * segments.length) * segmentLength;
      var sprite = { w: 80 };
      var speed = maxSpeed/4 + Math.random() * maxSpeed/2;
      cars.push({ offset: offset, z: z, sprite: sprite, speed: speed });
    }
  }

  function findSegment(z) {
    return segments[Math.floor(z/segmentLength) % segments.length];
  }

  // Render y update (adaptados del original)
  function update(dt) {
    var n, sprite, spriteW;
    var playerSegment = findSegment(position+playerZ);
    var playerW       = SPRITES.PLAYER_STRAIGHT.w * SPRITES.SCALE;
    var speedPercent  = speed/maxSpeed;
    var dx            = dt * 2 * speedPercent;
    var startPosition = position;

    updateCars(dt, playerSegment, playerW);

    position = Util.increase(position, dt * speed, trackLength);

    if (keyLeft)
      playerX = playerX - dx;
    else if (keyRight)
      playerX = playerX + dx;

    playerX = playerX - (dx * speedPercent * playerSegment.curve * centrifugal);

    if (keyFaster)
      speed = Util.accelerate(speed, accel, dt);
    else if (keySlower)
      speed = Util.accelerate(speed, breaking, dt);
    else
      speed = Util.accelerate(speed, decel, dt);

    if ((playerX < -1) || (playerX > 1)) {
      if (speed > offRoadLimit)
        speed = Util.accelerate(speed, offRoadDecel, dt);
      for(n = 0 ; n < playerSegment.sprites.length ; n++) {
        sprite  = playerSegment.sprites[n];
        spriteW = 80 * SPRITES.SCALE;
        if (Util.overlap(playerX, playerW, sprite.offset + spriteW/2 * (sprite.offset > 0 ? 1 : -1), spriteW)) {
          speed = maxSpeed/5;
          position = Util.increase(playerSegment.p1.world.z, -playerZ, trackLength);
          break;
        }
      }
    }

    var car, carW;
    for(n = 0 ; n < playerSegment.cars.length ; n++) {
      car  = playerSegment.cars[n];
      carW = car.sprite.w * SPRITES.SCALE;
      if (speed > car.speed) {
        if (Util.overlap(playerX, playerW, car.offset, carW, 0.8)) {
          speed    = car.speed * (car.speed/speed);
          position = Util.increase(car.z, -playerZ, trackLength);
          break;
        }
      }
    }

    playerX = Util.limit(playerX, -3, 3);
    speed   = Util.limit(speed, 0, maxSpeed);

    skyOffset  = Util.increase(skyOffset,  skySpeed  * playerSegment.curve * (position-startPosition)/segmentLength, 1);
    hillOffset = Util.increase(hillOffset, hillSpeed * playerSegment.curve * (position-startPosition)/segmentLength, 1);
    treeOffset = Util.increase(treeOffset, treeSpeed * playerSegment.curve * (position-startPosition)/segmentLength, 1);

    if (position > playerZ) {
      if (currentLapTime && (startPosition < playerZ)) {
        lastLapTime    = currentLapTime;
        currentLapTime = 0;
        if (lastLapTime <= Util.toFloat(Dom.storage.fast_lap_time)) {
          Dom.storage.fast_lap_time = lastLapTime;
          updateHud('fast_lap_time', formatTime(lastLapTime));
        }
        updateHud('last_lap_time', formatTime(lastLapTime));
        Dom.show('last_lap_time');
      }
      else {
        currentLapTime += dt;
      }
    }

    updateHud('speed',            5 * Math.round(speed/500));
    updateHud('current_lap_time', formatTime(currentLapTime));
  }

  function updateCars(dt, playerSegment, playerW) {
    var n, car, oldSegment, newSegment;
    for(n = 0 ; n < cars.length ; n++) {
      car         = cars[n];
      oldSegment  = findSegment(car.z);
      car.offset  = car.offset; // no IA compleja
      car.z       = Util.increase(car.z, dt * car.speed, trackLength);
      car.percent = Util.percentRemaining(car.z, segmentLength);
      newSegment  = findSegment(car.z);
      if (oldSegment != newSegment) {
        var index = oldSegment.cars.indexOf(car);
        oldSegment.cars.splice(index, 1);
        newSegment.cars.push(car);
      }
    }
  }

  // Render muy simplificado (solo limpia canvas)
  function render() {
    ctx.clearRect(0,0,canvas.width, canvas.height);
    // Para mantenerlo ligero, omitimos el dibujado completo de carretera
    // (El ejemplo completo podría reimplementarse aquí si fuese necesario)
  }

  function reset(options) {
    options       = options || {};
    canvas.width  = width  = Util.toInt(options.width,          width);
    canvas.height = height = Util.toInt(options.height,         height);
    lanes                  = Util.toInt(options.lanes,          lanes);
    roadWidth              = Util.toInt(options.roadWidth,      roadWidth);
    cameraHeight           = Util.toInt(options.cameraHeight,   cameraHeight);
    drawDistance           = Util.toInt(options.drawDistance,   drawDistance);
    fogDensity             = Util.toInt(options.fogDensity,     fogDensity);
    fieldOfView            = Util.toInt(options.fieldOfView,    fieldOfView);
    segmentLength          = Util.toInt(options.segmentLength,  segmentLength);
    rumbleLength           = Util.toInt(options.rumbleLength,   rumbleLength);
    cameraDepth            = 1 / Math.tan((fieldOfView/2) * Math.PI/180);
    playerZ                = (cameraHeight * cameraDepth);
    resolution             = height/480;

    if ((segments.length==0) || (options.segmentLength) || (options.rumbleLength))
      resetRoad();
  }

  // Arranque del juego
  Game.run({
    canvas: canvas,
    render: render,
    update: update,
    stats: stats,
    step: step,
    images: ["background", "sprites"],
    keys: [
      { keys: [KEY.LEFT,  KEY.A], mode: 'down', action: function() { keyLeft   = true;  } },
      { keys: [KEY.RIGHT, KEY.D], mode: 'down', action: function() { keyRight  = true;  } },
      { keys: [KEY.UP,    KEY.W], mode: 'down', action: function() { keyFaster = true;  } },
      { keys: [KEY.DOWN,  KEY.S], mode: 'down', action: function() { keySlower = true;  } },
      { keys: [KEY.LEFT,  KEY.A], mode: 'up',   action: function() { keyLeft   = false; } },
      { keys: [KEY.RIGHT, KEY.D], mode: 'up',   action: function() { keyRight  = false; } },
      { keys: [KEY.UP,    KEY.W], mode: 'up',   action: function() { keyFaster = false; } },
      { keys: [KEY.DOWN,  KEY.S], mode: 'up',   action: function() { keySlower = false; } }
    ],
    ready: function(images) {
      background = images[0];
      sprites    = images[1];
      reset();
      Dom.storage.fast_lap_time = Dom.storage.fast_lap_time || 180;
      updateHud('fast_lap_time', formatTime(Util.toFloat(Dom.storage.fast_lap_time)));
    }
  });
})();

