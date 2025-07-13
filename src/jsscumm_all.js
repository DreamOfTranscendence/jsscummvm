//LICENSE
/*
Copyright (c) 2010 Mutwin Kraus

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
//end LICENSE


//me-mod
//"I'm going to change the code a little" - dreamoft

self.__scummvm_js_html_=`
  <title>JS ScummVM</title>

  <h1>JS ScummVM</h1>

  <canvas id="jsscummvm" width="640" height="400"></canvas>
  <div id="console"></div>

  <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script>
  <script type="text/javascript" src="/./src/jsscumm_all.js"></script>
  <script type="text/javascript">
    ScummVM.load("monkey1"); //default game;
  </script>
`;


// S P L U N K rnd00437_dot_333333
// splunk means split chunk, use 'begin' below to read file name; it's like content type form multi-part for multiple files
//I did this so you can see what the original js files were before I merged them

// B E G I N  "src/jsscumm.js"
var ScummVM = {
  width: 640,
  height: 400,
  scale: 1,
  engines: {},
  engine: null,
  canvas: null,
  context: null,
  debugLevel: 3
};

function log(message) {
  // window.console.log(message);
  $("#console").prepend(message+"<br />");
}

function debug(level, message) {
  if(level <= ScummVM.debugLevel)
    log(message);
}

function error(message) {
  log("ERROR "+message);
}

function assert(condition) {
  if(!condition) {
    log("ASSERTION FAILED!");
  }
}

(function(){
  var canvas = document.getElementById("jsscummvm");
  var context = canvas.getContext('2d');
  ScummVM.load = function(game) {
    var t = ScummVM;
    t.canvas = canvas;
    t.context = context
    t.init_graphics();
    t.engine = ScummVM.engines.SCUMM;
    t.engine.init(game);
    t.engine.go();
  };
  ScummVM.init_graphics = function() {
    var t = this;
    t.context.fillRect(0,0,this.width,this.height);
  };

  window.document.addEventListener("keypress", function(e) {
    var c = String.fromCharCode(e.keyCode)
    ScummVM.engine._lastKeyHit = "ESC";
    return true;
  });

}());
// E N D      "src/jsscumm.js"


// S P L U N K rnd00437_dot_333333
// B E G I N  "src/system.js"
(function(){
  var filesToLoad = 0;

  ScummVM.system = {
    new_dir_table: [ 270, 90, 180, 0 ],
    Point: function(x, y) {
      return {x: x, y: y};
    },
    clone: function(obj) {
      var clone = {};
      clone.prototype = obj.prototype;
      for (property in obj) clone[property] = obj[property];
      return clone;
    },
    getMillis: function() {
      d = new Date();
      return d.getTime();
    },
    loadGameFiles: function(game, file_nos, callback) {
      var callback = callback;
      var t = this, i;

      filesToLoad += file_nos.length;

      for(i = 0; i < file_nos.length; i++) {
        var i = i;
        (function() { // Fix var scope
        var file_no = file_nos[i];
        var filename = game + ".00"+file_no.toString();
        var game_url = "games/"+game+"/"+filename;

        if(navigator.vendor.match("Apple") && window.localStorage[game_url]) {
          log(game_url + " loaded from cache");
          ScummVM.engine.setFile(file_no, filename, localStorage[game_url]);
          filesToLoad--;
          if(t.finishedLoading() && callback)
            callback();
        } else {
          $.ajax({type: "GET", url: game_url, dataType: "text", cache:false, success: function(data) {
            log(game_url + " loaded");
            try {
              if(navigator.vendor.match("Apple")) window.localStorage[game_url] = data;
            } catch(e) {
            };
            ScummVM.engine.setFile(file_no, filename, data);
            filesToLoad--;
            if(t.finishedLoading() && callback)
              callback();
          }, beforeSend: function(xhr) { xhr.overrideMimeType("text/plain; charset=x-user-defined"); } });
        }
        })();
      }
    },
    finishedLoading: function() {
      return filesToLoad == 0;
    },
    xorString: function(str, encByte) {
      stream = new ScummVM.Stream(str, "", str.length);
      stream.encByte = encByte;
      return stream.readString(str.length);
    },
    MKID_BE: function(id) {
      s = new ScummVM.Stream(id, "", 4);
      return s.readUI32(true);
    },
    reverse_MKID: function(value) {
      var isNegative, orig_value, i, Rem, s = "";
      isNegative = (value < 0);
      if (isNegative) {
        value = value * (0 - 1);
      }
      orig_value = value;
      for (i = 0; i < 4; i++) {
        Rem = value % 256;
        if (isNegative) {
          Rem = 255 - Rem;
        }
        s = String.fromCharCode(Rem) + s;
        value = Math.floor(value / 256);
      }
      if (value > 0) {
        throw ("Argument out of range: " + orig_value);
      }
      return s;
    },
    newDirToOldDir: function(dir) {
      if(dir >= 71 && dir <= 109) return 1;
      if(dir >= 109 && dir <= 251) return 2;
      if(dir >= 251 && dir <= 289) return 0;
      return 3;
    },
    oldDirToNewDir: function(dir) {
      return this.new_dir_table[dir];
    },
    toSimpleDir: function(dir) {
      var directions = [ 22, 72, 107, 157, 202, 252, 287, 337];
      for(var i = 0; i < 7; i++) {
        if(dir >= directions[i] && dir <= directions[i+1])
            return i+1;
      }
      return 0;
    },
    normalizeAngle: function(angle) {
      var temp = (angle + 360) % 360;
      return this.toSimpleDir(temp) * 45;
    }
  };
}());

// E N D      "src/system.js"


// S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/stream.js"
 (function(){
  ScummVM.Stream = function(data, filename, size) {
    this.filename = filename;
    this.buffer = data;
    if(filename == "")
      this.length = size || 0;
    else
      this.length = this.buffer.length;
    this.offset = 0;
    this.encByte = 0;
  };
  ScummVM.WritableStream = function(data, size) {
    this.filename = "";
    if(typeof data == "string")
      this.buffer = data.split("");
    else
      this.buffer = data;

    if(filename == "")
      this.length = size || 0;
    else
      this.length = this.buffer.length;
    this.offset = 0;
    this.encByte = 0;
  };
  ScummVM.Stream.prototype = {
    newStream: function(offset, size) {
      stream = new ScummVM.Stream(this.buffer.substring(offset, offset+size), this.filename);
      stream.encByte = this.encByte;
      debug(7, "New Stream "+this.filename+" at offset "+offset+" total size "+this.length+" stream size "+stream.length);
      return stream;
    },
    newAbsoluteStream: function(offset) {
      stream = new ScummVM.Stream(this.buffer, this.filename, this.length);
      stream.offset = offset;
      stream.encByte = this.encByte;
      debug(7, "New absolute Stream "+this.filename+" at offset "+stream.offset+" total size "+stream.length);
      return stream;
    },
    newRelativeStream: function(offset) {
      stream = new ScummVM.Stream(this.buffer, this.filename, this.length);
      stream.offset = this.offset;
      stream.encByte = this.encByte;
      if(offset)
        stream.seek(offset);
      debug(7, "New relative Stream "+this.filename+" at offset "+stream.offset+" total size "+stream.length);
      return stream;
    },
    readByteAt: function(pos){
      return (this.buffer.charCodeAt(pos) & 0xff) ^ this.encByte;
    },
    readNumber: function(numBytes, bigEnd){
        var t = this,
            val = 0;
        if(bigEnd){
            var i = numBytes;
            while(i--){ val = (val << 8) + t.readByteAt(t.offset++); }
        }else{
            var o = t.offset,
                i = o + numBytes;
            while(i > o){ val = (val << 8) + t.readByteAt(--i); }
            t.offset += numBytes;
        }
        return val;
    },
    readSNumber: function(numBytes, bigEnd){
        var val = this.readNumber(numBytes, bigEnd),
            numBits = numBytes * 8;
        if(val >> (numBits - 1)){ val -= Math.pow(2, numBits); }
        return val;
    },
    readSI8: function(){
        return this.readSNumber(1);
    },
    readSI16: function(bigEnd){
        return this.readSNumber(2, bigEnd);
    },
    readSI32: function(bigEnd){
        return this.readSNumber(4, bigEnd);
    },
    readUI8: function(){
        return this.readNumber(1);
    },
    readUI16: function(bigEnd){
        return this.readNumber(2, bigEnd);
    },
    readUI24: function(bigEnd){
        return this.readNumber(3, bigEnd);
    },
    readUI32: function(bigEnd){
        return this.readNumber(4, bigEnd);
    },
    readString: function(numChars){
      var t = this,
          b = t.buffer, str,
          chars = [];
      if(undefined != numChars){
        if(t.encByte == 0x00) {
          str = b.substr(t.offset, numChars);
          t.offset += numChars;
          return str;
        }
      }else{
        numChars = t.length - t.offset;
      }
      var i = numChars;
      while(i--){
          var code = t.readByteAt(t.offset++);
          if(code){ chars.push(String.fromCharCode(code)); }
          else{ break; }
      }
      str = chars.join('');
      return str;
    },
    seek: function(offset, absolute, ignoreWarnings){
      this.offset = (absolute ? 0 : this.offset) + offset;
      if(this.offset > this.length && !ignoreWarnings)
        window.console.log("jumped too far");
      return this;
    },
    eof: function() {
      return this.offset >= this.length;
    },
    reset: function() {
      this.seek(0, true);
      return this;
    },
    findNext: function(tag) {
      var t = this, oldoff = t.offset, rtag;
      while((rtag = t.readUI32(true)) != tag) {
        if(t.offset >= t.length) {
          t.seek(oldoff, true); return false;
        }
        size = t.readUI32(true);
        if(size == 0) {
          t.seek(oldoff, true); return false;
        }
        t.offset += size - 8;
      }
      t.seek(4);
      return true;
    },

  };
  ScummVM.WritableStream.prototype = {
    newRelativeStream: function(offset) {
      stream = new ScummVM.WritableStream(this.buffer, this.length);
      stream.offset = this.offset;
      stream.encByte = this.encByte;
      if(offset)
        stream.seek(offset);
      debug(7, "New relative Stream "+this.filename+" at offset "+stream.offset+" total size "+stream.length);
      return stream;
    },
    writeByteAt: function(pos, value) {
      this.buffer[pos] = String.fromCharCode(value & 0xFF);
    },
    writeUI8: function(value) {
      this.writeByteAt(this.offset, value);
      this.offset++;
    },
    readUI8: function() {
      val = this.buffer[this.offset++];
      return val ? val.charCodeAt(0) : 0;
    },
    toStr: function() {
      return this.buffer.join("");
    },
    seek: function(offset, absolute, ignoreWarnings){
      this.offset = (absolute ? 0 : this.offset) + offset;
      if(this.offset > this.length && !ignoreWarnings)
        window.console.log("jumped too far");
      return this;
    },
    reset: function() {
      this.seek(0, true);
      return this;
    }
  };

}());

 // E N D      src="src/stream.js"


// S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/engines/scumm.js"
 var PARAM_1 = 0x80, PARAM_2 = 0x40, PARAM_3 = 0x20;

(function(){
  var _system = ScummVM.system, Point = _system.Point;

  ScummVM.engines.SCUMM = {
    _screenWidth: 320,
    _screenHeight: 200,
    _engineStartTime: 0,
    _files: [],
    _file: null,
    _filenames: {},
    _fileOffset: 0,
    _game: "",
    _roomoffs: {},
    _roomno: {},
    _roomResource: 0,
    _lastLoadedRoom: -1,
    _nums: {},
    _objs: [],
    _objectRoomTable: [],
    _objectOwnerTable: [],
    _objectStateTable: [],
    _classData: [],
    _bootParam: 0,
    _scummVars: [],
    _scummStackPos: 0,
    _bitVars: [],
    _vm: null,
    _vmstack: [],
    _currentScript: 0xFF,
    _currentRoom: 0,
    _numObjectsInRoom: 0,
    _scriptPointer: null,
    _scriptOrgPointer: null,
    _lastCodePointer: null,
    _res: null,
    _vars: {},
    _verbs: [],
    _opcodes: {},
    _scriptFile: null,
    _dumpScripts: false,
    _completeScreenRedraw: true,
    _shouldQuit: false,
    _timer: 0,
    _virtscreens: [],
    _resultVarNumber: 0,
    _string: [],
    _actorToPrintStrFor: 0,
    _roomPalette: [],
    _currentPalette: [],
    _palDirtyMin: 0,
    _palDirtyMax: 0,
    _haveMsg: 0,
    _haveActorSpeechMsg: false,
    _useTalkAnims: false,
    _defaultTalkDelay: 0,
    _curPalIndex: 0,
    _resourceHeaderSize: 8,
    _resourceLastSearchSize: 0,
    _resourceLastSearchBuf: null,
    _gdi: null,
    _gfx: {ENCD: 0, EXCD:0, EPAL:0, CLUT:0, PALS:0},
    _drawObjectQue: [],
    _debugMode: 0,
    _debug: false,
    _screenStartStrip: 0,
    _screenEndStrip: 0,
    _localScriptOffsets: [],
    _skipDrawObject: false,
    _texts: [],
    _charsetData: [],
    _charsetColorMap: [],
    _actors: [],
    _sortedActors: [],
    _lastKeyHit: "",
    _camera: {cur: Point(0,0), dest: Point(0,0), accel: Point(0,0), last: Point(0,0), follows: 0, mode: "normal", movingToActor:false},
    init: function(game) {
      this._game = game;
      this.initGraphics();
    },
    setFile: function(file_no, filename, data) {
      stream = new ScummVM.Stream(data, filename);
      stream.encByte = 0x69;
      this._files[file_no] = stream;
      this._filenames[filename] = file_no;
    },
    go: function() {
      var t = this;
      _system.loadGameFiles(this._game, [0, 1], function() {
          t.launch();
      });
    },
    launch: function() {
      var t = this;
      if(t._files.length > 1) {
        var diff = 0, delta = 0;

        t._file = t.indexFile();
        t._engineStartTime = _system.getMillis() / 1000;
        t._res = new t.ResourceManager(t);

        t.setupScumm();
        t.readIndexFile();
        t.resetScumm();
        t.resetScummVars();
        t.runBootscript();

        t._timer = window.setInterval(function() {
          t.scummVar("timer", Math.floor(diff * 60 / 1000));
          t.scummVar("timer_total", t.scummVar("timer_total") + Math.floor(diff * 60 / 1000));
          delta = t.scummVar("timer_next");
          if(delta < 1)
            delta = 1;

          t.waitForTimer(Math.floor(delta * 1000 / 60) - diff, function() {
            diff = _system.getMillis();
            t.loop(delta);
            diff = _system.getMillis() - diff;
          });


        }, 1000 / 12);
      }
    },
    waitForTimer: function(ticks, callback) {
      window.setTimeout(callback, ticks);
    },
    loop: function(delta) {
      var t = ScummVM.engines.SCUMM;

      t.scummVar("tmr_1", t.scummVar("tmr_1") + delta);
      t.scummVar("tmr_2", t.scummVar("tmr_2") + delta);
      t.scummVar("tmr_3", t.scummVar("tmr_3") + delta);

      if(delta > 15)
        delta = 15;

      t.decreaseScriptDelay(delta);

      this.processInput();
      t.updateScummVars();
      if(t._completeScreenRedraw) {
        // Draw Verbs
        t._completeScreenRedraw = false;
        t._fullRedraw = true;
      }

      t.runAllScripts();
      // Verbs

      if(t.shouldQuit()) {
        window.clearInterval(t._timer);
        return;
      }

      if(t._currentRoom == 0) {
        t.drawDirtyScreenParts();
      } else {
        t.walkActors();
        t.moveCamera();
        if(t._bgNeedsRedraw || t._fullRedraw)
          t.redrawBGAreas();
        t.processDrawQueue();

        t.resetActorBgs();
        t.processActors();

        t._fullRedraw = false;

        if(t.scummVar("main_script")) {
          t.runScript(t.scummVar("main_script"), 0, 0, 0);
        }

        t.updatePalette();
        t.drawDirtyScreenParts();
      }

      // t._shouldQuit = true;
    },
    updateScummVars: function() {
      var t = this;
      t.scummVar("have_msg", t._haveMsg);
      t.scummVar("mouse_x", 10);
      t.scummVar("mouse_y", 10);
    },
    shouldQuit: function() {
      var t = ScummVM.engines.SCUMM;
      if(t._shouldQuit) return true;
      return false;
    },
    processInput: function() {
      var t = this;
      if(t._lastKeyHit == "ESC") {
        t.abortCutscene();
      }
      t._lastKeyHit = "";
    },
    setupScumm: function() {
      var t = this, res = t._res;

      res.allocResTypeData("buffer", 0, 10, "buffer", 0);
      t.setupScummVars();
      t._vm = new t.VirtualMachineState();
    },
    resetScumm: function() {
      var t = this, i;
      t.initScreens(16, 144);
      t._currentRoom = 0;
      for(i = 0; i < 256; i++)
        t._roomPalette[i] = i;
      t.resetPalette();
      t.loadCharset(1);
      // t._cursor.animate = 1;
      for(i = 0; i < t._nums['actors']; i++)
        t._actors[i] =  new t.Actor(i);
      t._vm.numNestedScripts = 0;
      // verbs
      // camera triggers
      // camera._follows = 0;
      t._virtscreens[0].xstart = 0;
      t._currentScript = 0xFF;
      t._currentRoom = 0;
      t._numObjectsInRoom = 0;
      t._actorToPrintStrFor = 0;
      t._fullRedraw = true;

      t.clearDrawObjectQueue();
    }
  };
}());

 // E N D      src="src/engines/scumm.js"


// S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/engines/resources.js"
 (function(){
  var _system = ScummVM.system;

  var resourceTypes = ["charset", "room", "room_image", "room_script", "script", "costume", "sound", "buffer", "string", "actor_name", "object_name", "inventory", "scale_table", "verb", "fl_object", "matrix", "image"];

  var RES_INVALID_OFFSET = 0xFFFFFFFF,
      OF_OWNER_MASK = 0x0F,
      OF_STATE_MASK = 0xF0,
      OF_STATE_SHL = 4;

  var s = ScummVM.engines.SCUMM;

  s.ResourceManager = function(engine) {
    var t = this;
    t.engine = engine;
    t.types = {};
    for(i in resourceTypes) {
      type = resourceTypes[i];
      t.types[type] = {mode: 1, num: 0, tags: 0, name:type, address:[], flags: 0, status: 0, roomno: [], roomoffs: []};
    }
  }

  s.ResourceManager.prototype = {
    validateResource: function(type, index) {
      for(i in resourceTypes) {
        t = resourceTypes[i];
        if(type == t && index < this.types[type].num) {
          return true;
        }
      }
      return false;
    },
    createResource: function(type, idx, size, source) {
      var t = this, stream,
          res = t.types[type],
          file = t.engine._file;

      if(source == -1) {
        buf = "";
        for(i = 0; i < size; i ++) {
          buf += String.fromCharCode(0);
        }
        stream = new ScummVM.WritableStream(buf, size);
      } else {
        if(source) file = source;

        stream = file.newStream(file.offset, size);
      }

      debug(5, "creating "+type+" resource "+idx+" in file "+stream.filename+" size "+size);
      res.address[idx] = stream;

      return stream;
    },
    allocResTypeData: function(id, tag, num, name, mode) {
      var t = this,
          res = t.types[id];
      res.mode = mode;
      res.num = num;
      res.tags = tag;
      res.name = name;
      res.status = 0;
      res.address = new Array(); res.roomno = new Array(); res.roomoffs = new Array();
      for(i = 0; i < num; i++) {
        res.roomno[i] = 0;
        res.roomoffs[i] = 0;
        res.address[i] = null;
      }
    }
  };

  s.ObjectData = function() {
    var t = this;
    t.OBIMoffset = 0;
    t.OBCDoffset = 0;
    t.walk_x = 0; t.walk_y = 0;
    t.obj_nr = 0;
    t.x_pos = 0; t.y_pos = 0;
    t.width = 0; t.height = 0;
    t.actordir = 0;
    t.parent = 0; t.parentstate = 0;
    t.state = 0;
    t.fl_object_index = 0;
    t.flags = 0;
  };

  s.indexFile = function() {
    return this._files[0];
  }

  s.generateFilename = function(room) {
    var res = this._res.types["room"];
    diskNumber = room > 0 ? res.roomno[room] : 0;
    return this._game + ".00"+diskNumber;
  }

  s.openResourceFile = function(filename) {
    debug(3, "opening "+filename);
    this._file = this._files[this._filenames[filename]];
    return true;
  }

  s.readIndexFile = function() {
    var t = this, blocktype, itemsize,
        numblock = 0,
        MKID_BE = _system.MKID_BE;
    var file = t._file;

    t.closeRoom();
    t.openRoom(0);
    while(true) {
      blocktype = file.readUI32(true);
      itemsize = file.readUI32(true);
      if(file.eof()) break;

      switch(blocktype) {
      case MKID_BE("DOBJ"):
        this._nums['global_objects'] = file.readUI16();
        itemsize -= 2;
      break;
      case MKID_BE("DROO"):
        this._nums['rooms'] = file.readUI16();
        itemsize -= 2;
      break;
      case MKID_BE("DSCR"):
        this._nums['scripts'] = file.readUI16();
        itemsize -= 2;
      break;
      case MKID_BE("DCOS"):
        this._nums['costumes'] = file.readUI16();
        itemsize -= 2;
      break;
      case MKID_BE("DSOU"):
        this._nums['sounds'] = file.readUI16();
        itemsize -= 2;
      break;
      // default:
      //   log("unknown block "+_system.reverse_MKID(blocktype));
      // break;
      }
      file.seek(itemsize - 8);
    }
    file.reset();
    while(true) {
      blocktype = file.readUI32(true);
      itemsize = file.readUI32(true);
      if(file.eof()) break;

      numblock++;
      t.readIndexBlock(file, blocktype, itemsize);
    }
    t.closeRoom();
  };

  s.readIndexBlock = function(file, blocktype, itemsize) {
    var t = this,
        MKID_BE = _system.MKID_BE;
    switch(blocktype) {
      case MKID_BE('DCHR'):
      case MKID_BE('DIRF'):
        t.readResTypeList(file, "charset");
      break;
      case MKID_BE("DOBJ"):
        t.readGlobalObjects(file);
      break;
      case MKID_BE("RNAM"):
        // Unused
        for(var room; room = file.readUI8(); ) {
          name = _system.xorString(file.readString(9), 0xFF);
          debug(5, "Room "+room+": "+name);
        }
      break;
      case MKID_BE("DROO"):
      case MKID_BE("DIRR"):
        t.readResTypeList(file, "room");
      break;
      case MKID_BE("DSCR"):
      case MKID_BE("DIRS"):
        t.readResTypeList(file, "script");
      break;
      case MKID_BE("DCOS"):
      case MKID_BE("DIRC"):
        t.readResTypeList(file, "costume");
      break;
      case MKID_BE("MAXS"):
        t.readMAXS(file, itemsize);
        t.allocateArrays();
      break;
      case MKID_BE("DIRN"):
      case MKID_BE("DSOU"):
        t.readResTypeList(file, "sound");
      break;
      case MKID_BE("AARY"):
        log("AARY unsupported");
      break;
      default:
        log("unknown block "+_system.reverse_MKID(blocktype));
      break;
    }
  };

  s.readRoomsOffsets = function() {
    var t = this,
        file = t._files[1],
        res = t._res.types["room"];
    num = file.seek(16, true).readUI8();
    while(num--) {
      room = file.readUI8();
      if(!res.roomoffs[room]) {
        res.roomoffs[room] = file.readUI32();
      } else {
        file.readUI32();
      }
    }
    file.reset();
  };

  s.deleteRoomOffsets = function() {
    var t = this,
        res = t._res.types["room"];

    res.roomofs = [];
  };

  s.closeRoom = function() {
    var t = this,
        file = t._file;
    if(t._lastLoadedRoom != -1) {
      t._lastLoadedRoom = -1;
      t.deleteRoomOffsets();
      file.reset();
    }
  };

  s.openRoom = function(room) {
    var t = this,
        file = t._file,
        res = t._res.types["room"];
    if(t._lastLoadedRoom == room)
      return;
    t._lastLoadedRoom = room;
    debug(3, "loading room " + room);
    if(room == -1) {
      t.deleteRoomOffsets();
      file.reset();
      return;
    }
    diskNumber = room ? res.roomno[room] : 0;
    room_offs = room ? res.roomoffs[room] : 0;

    while(room_offs != RES_INVALID_OFFSET) {
      this.readRoomsOffsets();

      filename = t.generateFilename(room);
      if(t.openResourceFile(filename)) {
        file = t._file;
        if(room == 0)
          return;

        // t.deleteRoomOffsets();
        // t.readRoomsOffsets();

        t._fileOffset = res.roomoffs[room];

        if(t._fileOffset != 8)
          return;
      }
      log("ask for disk "+diskNumber);
    }
    t.deleteRoomOffsets();
    t._fileOffset = 0;
  };

  s.readResTypeList = function(file, type) {
    var t = this;
    var num, i;
    num = file.readUI16();

    var res = t._res.types[type];

    res.num = num;

    for(i = 0; i < num; i++) {
      res.roomno[i] = file.readUI8();
    }
    for(i = 0; i < num; i++) {
      res.roomoffs[i] = file.readUI32();
    }
  };

  s.readMAXS = function(file, itemsize) {
    var t = this;
    t._nums['variables'] = file.readUI16();
    file.readUI16(); // Skip
    t._nums['bit_variables'] = file.readUI16();
    t._nums['local_objects'] = file.readUI16();
    t._nums['array'] = 50;
    t._nums['verbs'] = 100;
    t._nums['new_names'] = 130;
    t._objectRoomTable = null;
    file.readUI16(); // Skip
    t._nums['charsets'] = file.readUI16();
    file.readUI16(); // Skip
    file.readUI16(); // Skip
    t._nums['inventory'] = file.readUI16();
    t._nums['global_scripts'] = 200;
    t._nums['shadow_pallete_size'] = 256;
    t._nums['fl_object'] = 50;
    t._nums['images'] = 0;
    t._nums['actors'] = 13;
  };

  s.allocateArrays = function() {
    var t = this, i,
        res = t._res,
        nums = t._nums,
        MKID_BE = _system.MKID_BE;

    for(i = 0; i < nums['variables']; i++) {
      t._scummVars[i] = 0;
    }
    for(i = 0; i < nums['local_objects']; i++) {
      t._objs[i] = new t.ObjectData();
    }
    for(i = 0; i < nums['bit_variables'] >> 3; i++) {
      t._bitVars[i] = 0;
    }
    res.allocResTypeData("costume", MKID_BE('COST'), nums['costumes'], "costume", 1);
    res.allocResTypeData("room", MKID_BE('ROOM'), nums['rooms'], "room", 1);
    res.allocResTypeData("room_image", MKID_BE('RMIM'), nums['rooms'], "room image", 1);
    res.allocResTypeData("script", MKID_BE('SCRP'), nums['scripts'], "script", 1);
    // charset
    res.allocResTypeData("object_name", 0, nums['new_names'], "new name", 0);
    // inventory
    // temp ?
    // scale_table
    res.allocResTypeData("actor_name", 0, nums['actors'], "actor name", 0);
    // verb
    res.allocResTypeData("string", 0, nums['array'], "array", 0);
    res.allocResTypeData("fl_object", 0, nums['fl_object'], "flobject", 0);
    // matrix
    res.allocResTypeData("image", MKID_BE('AWIZ'), nums['images'], "images", 1);

  };

  s.readGlobalObjects = function(file) {
    var t = this, i, num;

    num = file.readUI16();
    assert(num == t._nums['global_objects']);
    for(i = 0; i < num; i++) {
      v = file.readUI8();
      t._objectStateTable[i] = v >> OF_STATE_SHL;
      t._objectOwnerTable[i] = v & OF_OWNER_MASK;
    }
    for(i = 0; i < num; i++) {
      t._classData[i] = file.readUI32();
    };
  };

  s.loadCharset = function(no) {
    var t = this, i, ptr;
    ptr = t.getResourceAddress("charset", no);
    t._charsetData[no] = [];
    for(i = 0; i < 15; i++) {
      t._charsetData[no][i + 1] = ptr.seek(i + 14, true).readUI8();
      t._charsetColorMap[i] = t._charsetData[no][i + 1];
    }
  };

  s.getResourceRoomNr = function(type, idx) {
    var t = this,
        res = t._res.types[type];
    if(type == "room") return idx;
    return res.roomno[idx];
  }
  s.getResourceAddress = function(type, idx) {
    var t = this, offset,
        res = t._res,
        res_type = res.types[type];

    if(!res.validateResource(type, idx)) return null;
     if(res_type.mode)
       t.ensureResourceLoaded(type, idx);

    return res_type.address[idx];
  };

  s.ensureResourceLoaded = function(type, idx) {
    var t = this, addr
        res = t._res.types[type];

    if(type == "room" && idx > 0x0F) {
      // resourceMapper
    }
    if(type != "charset" && idx == 0) return;

    if(idx <= res.num)
      addr = res.address[idx];

    if(addr) return;

    t.loadResource(type, idx);
    // ROOM_FLAG
  };

  s.loadResource = function(type, idx) {
    var t = this, roomNr,
        res = t._res.types[type],
        fileOffs, size, tag;

    roomNr = t.getResourceRoomNr(type, idx);
    if(idx >= res.num) {
      error("resource undefined, index out of bounds");
    }
    if(roomNr == 0)
      roomNr = t._roomResource;

    window.console.log("loading resource "+type+" "+idx+" in room "+roomNr);

    if(type == "room") {
      fileOffs = 0;
    } else {
      fileOffs = res.roomoffs[idx];
      if(fileOffs == RES_INVALID_OFFSET)
        return 0;
    }

    t.openRoom(roomNr);

    var file = t._file;

    file.seek(t._fileOffset + fileOffs, true);

    tag = file.readUI32(true);
    size = file.readUI32(true);
    debug(5, _system.reverse_MKID(tag) + " "+size);
    file.seek(-8);

    t._res.createResource(type, idx, size);

    if(t._dumpScripts && type == "script")
      t.dumpResource("script-", idx, t.getResourceAddress("script", idx));
  };

  s.loadPtrToResource = function(type, resindex, source) {
    var t = this, len;
    len = t.resStrLen(source) + 1;
    if(len <= 0)
      return;

    if(!source) source = t._scriptPointer;
    ptr = t._res.createResource(type, resindex, len, source);
    source.seek(len);
  };

  s.dumpResource = function(tag, idx, stream) {
    var size = stream.length;
    log("dump "+tag+idx)
    log(stream.readString(size));
  };

  s.findResource = function(tag, source, debug) {
    var t = this, curpos, totalsize, size, searchin;

    searchin = source.newRelativeStream(4);
    t._resourceLastSearchSize = totalsize = searchin.readUI32(true);
    curpos = 8;

    while(curpos < totalsize) {
      t = searchin.readUI32(true)
      if(t == tag) {
        t._resourceLastSearchBuf = searchin;
        size = searchin.readUI32(true);
        searchin.seek(-8);
        return searchin.newStream(searchin.offset, size);
      }
      size = searchin.readUI32(true);
      if(size <= 8)
        return null;

      searchin.seek(size - 8);
      curpos += size;
    }
    return null;
  };

  s.findResourceData = function(tag, source) {
    var t = this,
        res = t.findResource(tag, source);
    if(res) res.seek(t._resourceHeaderSize);
    return res;
  };

  s.getResourceDataSize = function(stream) {
    var t = this, size, old_offset = stream.offset;

    stream.seek(4, true);
    size = stream.readUI32(true) - t._resourceHeaderSize;
    stream.seek(old_offset, true);
    return size;
  };

}());


 // E N D      src="src/engines/resources.js"


// S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/engines/script.js"
 (function() {
  var _system = ScummVM.system,
      s = ScummVM.engines.SCUMM,
      NUM_SCRIPT_SLOT = 80;

  s.ScriptSlot = function(slot) {
    var t = this;
    t.number = 0;
    t.offs = 0;
    t.status = "dead";
    t.where = "";
    t.freezeResistant = false;
    t.recursive = false;
    t.freezeCount = 0;
    t.cutSceneOverride = 0;
    t.delayFrameCount = 0;
    t.didexec = false;
    t.args = [];
    t.slot = slot;
    t.cycle = 0;
    t.delay = 0;
    t.ptr = null;
  };

  s.NestedScript = function() {
    var t = this;
    t.number = 0;
    t.where = "";
    t.slot = 0;
  };

  s.VirtualMachineState = function() {
    var t = this;
    t.slot = [];
    t.nest = [];
    t.numNestedScripts = 0;
    t.localvar = []
    t.cutSceneStackPointer = -1;
    t.cutScenePtr = [];
    t.cutSceneScript = [];
    t.cutSceneScriptIndex = 0;
    t.cutSceneData = [];

    for(var i = 0; i < 80; i++) {
      if(i < 15)
        t.nest[i] = new s.NestedScript();
      t.slot[i] = new s.ScriptSlot(i);
      t.localvar[i] = [];
    }
  }

  s.scummVar = function(name,value) {
    var t = this;
    if(typeof value != "undefined")
      t._scummVars[t._vars[name]] = value;
    return t._scummVars[t._vars[name]];
  }

  s.runBootscript = function() {
    var t = this, i;
    args = [];
    for(i = 0; i < 16; i++) {
      args[i] = 0;
    }
    args[0] = t._bootParam;
    t.runScript(1, 0, 0, args);
  };

  var slot_status = ["dead", "paused", "running"];

  s.freezeScripts = function(flag) {
    var t = this, vm = t._vm, i;
    for(i = 0; i < vm.slot.length; i++) {
      if(t._currentScript != i && vm.slot[i].status != "dead" && !vm.slot[i].freezeResistant) {
        vm.slot[i].status = "paused";
        vm.slot[i].freezeCount++;
      }
    }
    // sentence stuff
    if(vm.cutSceneScriptIndex != 0xFF) {
      vm.slot[vm.cutSceneScriptIndex].status = "running";
      vm.slot[vm.cutSceneScriptIndex].freezeCount = 0;
    }
  };

  s.unfreezeScripts = function() {
    var t = this, vm = t._vm, i;
    for(i = 0; i < vm.slot.length; i++) {
      if(vm.slot[i].status == "paused" && !--vm.slot[i].freezeCount) {
        vm.slot[i].status = "running";
      }

    }
    // sentence stuff
  };

  s.runAllScripts = function() {
    var t = this, i, vm = t._vm, numCycles = 1, cycle, slot;

    for(i = 0; i < vm.slot.length; i++) {
      slot = vm.slot[i];
      slot.didexec = false;
    }
    t._currentScript = 0xFF;
    for(cycle = 1; cycle <= numCycles; cycle++) {
      for(i = 0; i < vm.slot.length; i++) {
        slot = vm.slot[i];
        if(slot.cycle == cycle && slot.status == "running" && !slot.didexec) {
          t._currentScript = i;
          t.getScriptBaseAddress();
          t.getScriptEntryPoint();
          t.executeScript();
        }
      }
    }
  }

  s.runScript = function(script, freezeResistant, recursive, args, cycle) {
    var t = this, slot, scriptPtr, scriptOffs, scriptType;
    if(!script) return;
    if(!recursive) t.stopScript(script);


    if(script < t._nums['global_scripts']) {
      scriptPtr = t.getResourceAddress("script", script);
      scriptOffs = 8;
      scriptType = "global";
      // log("runScript(Global-"+script+") from "+t._roomResource);
    } else {
      scriptOffs = t._localScriptOffsets[script - t._nums['global_scripts']];
      scriptType = "local";
      // log("runScript("+script+") from "+t._roomResource);
    }

    if(!cycle) cycle = 1;

    slot = t.getScriptSlot();
    slot.number = script;
    slot.offs = scriptOffs;
    slot.status = "running";
    slot.where = scriptType;
    slot.freezeResistant = freezeResistant;
    slot.recursive = recursive;
    slot.freezeCount = 0;
    slot.delayFrameCount = 0;
    slot.ptr = null;
    slot.cycle = cycle;

    t.initializeLocals(slot.slot, args);

    t.runScriptNested(slot);
  };

  s.runScriptNested = function(slot) {
    var t = this, nest;

    t.updateScriptPtr();

    nest = t._vm.nest[t._vm.numNestedScripts];

    if(t._currentScript == 0xFF) {
      nest.number = 0xFF;
      nest.where = "";
    } else {
      nest.number = slot.number;
      nest.where = slot.where;
      nest.slot = t._currentScript;
    }

    t._vm.numNestedScripts++;
    t._currentScript = slot.slot;

    t.getScriptBaseAddress();
    t.getScriptEntryPoint();
    t.executeScript();


    if(t._vm.numNestedScripts > 0)
      t._vm.numNestedScripts--;

    if(nest.number != 0xFF) {
      t._currentScript = nest.slot;
      t.getScriptBaseAddress();
      t.getScriptEntryPoint();
      return;
    }

    t._currentScript = 0xFF;
  };

  s.stopObjectScript = function(slot) {
  };

  s.runExitScript = function() {
    var t = this, script = 0;
    if(script = t.scummVar("exit_script")) {
      t.runScript(script, 0, 0, 0);
    }
    if(t._gfx["EXCD"]) {
      slot = t.getScriptSlot();
      slot.status = "running";
      slot.number = 10001;
      slot.where = "room";
      slot.offs = 8;
      slot.ptr = t._gfx["EXCD"];
      slot.freezeResistant = 0;
      slot.freezeCount = 0;
      slot.delayFrameCount = 0;
      slot.recursive = false;
      slot.cycle = 1;
      t.initializeLocals(slot.slot, []);
      t.runScriptNested(slot);
    }
    if(script = t.scummVar("exit_script2")) {
      t.runScript(script, 0, 0, 0);
    }
  };

  s.runEntryScript = function() {
    var t = this, script;
    if(script = t.scummVar("entry_script")) {
      t.runScript(script, 0, 0, 0);
    }
    if(t._gfx["ENCD"]) {
      slot = t.getScriptSlot();
      slot.status = "running";
      slot.number = 10002;
      slot.where = "room";
      slot.offs = 8;
      slot.ptr = t._gfx["ENCD"];
      slot.freezeResistant = 0;
      slot.freezeCount = 0;
      slot.delayFrameCount = 0;
      slot.recursive = false;
      slot.cycle = 1;
      t.initializeLocals(slot.slot, []);
      t.runScriptNested(slot);
    }
    if(script = t.scummVar("entry_script2")) {
      t.runScript(script, 0, 0, 0);
    }
  };

  s.killScriptsAndResources = function() {
    var i, slot, vm = s._vm;
    for(i = 0; i < vm.slot.length; i++) {
      slot = vm.slot[i];
      if(slot.where == "room" || slot.where == "local") { // || flobject
        if(slot.cutSceneOverride) {
          slot.cutSceneOverride = 0;
        }
        slot.status = "dead";
      }
    }
  };

  s.decreaseScriptDelay = function(amount) {
    var t = this, slots = t._vm.slot, i;
    for(i = 0; i < slots.length; i++) {
      slot = slots[i];
      if(slot.status == "paused") {
        slot.delay -= amount;
        if(slot.delay < 0) {
          slot.status = "running";
          slot.delay = 0;
        }
      }
    }
  };

  s.isScriptRunning = function(script) {
    var t = this, slots = t._vm.slot, i;
    for(i = 0; i < slots.length; i++) {
      slot = slots[i];
      if(slot.number == script && (slot.where == "global" || slot.where == "local") && slot.status != "dead")
        return true;
    }
    return false;
  };

  s.updateScriptPtr = function() {
    var t = this, offset = 0;
    if(t._currentScript == 0xFF) {
      return;
    }
    t._vm.slot[t._currentScript].offs = t._scriptPointer.offset;
  }

  s.stopScript = function(script) {
    var t = this, i, slot, nest,
        slots = t._vm.slot;
    if(script == 0)
      return;
    for(i = 0; i < slots.length; i++) {
      slot = slots[i];
      if(script == slot.number && slot.status != "dead" && (slot.where == "global" || slot.where == "local")) {
        slot.number = 0;
        slot.status = "dead";
        // nukeArrays(i);
        if(t._currentScript == i)
          t._currentScript = 0xFF;
      }
    }
    for(i = 0; i < t._vm.numNestedScripts; i++) {
      nest = t._vm.nest[i];
      if(script == nest.number && (nest.where == "global" || nest.where == "local")) {
        // nukeArrays(nest.slot);
        nest.number = 0xFF;
        nest.slot = 0xFF;
        nest.where = "";
      }

    }
  };

  s.initializeLocals = function(slot, args) {
    var t = this, localvar = t._vm.localvar[slot], i;
    for(i = 0; i < 25; i++) {
      localvar[i] = args && args[i] ? args[i] : 0;
    }
  }

  s.getScriptSlot = function(n) {
    var t = this, i, slot = null;
    if(n && n > 0) {
      return t._vm.slot[n];
    } else {
      for(i = 1; i < t._vm.slot.length; i++) {
        slot = t._vm.slot[i];
        if(slot && slot.status == "dead")
          return slot;
      }
    }
    return null;
  };

  s.getScriptBaseAddress = function() {
    var t = this, slot;

    if(t._currentScript == 0xFF)
      return;

    // slot = t._vm.slot[t._currentScript]
    slot = t.getScriptSlot(t._currentScript);
    switch(slot.where) {
      case "global":
        t._scriptOrgPointer = t.getResourceAddress("script", slot.number);
        t._lastCodePointer = t._scriptOrgPointer.newRelativeStream();
      break;
      case "local":
      case "room":
        if(slot.ptr) t._scriptOrgPointer = slot.ptr;
        else t._scriptOrgPointer = t.getResourceAddress("room", t._roomResource);
        if(!t._scriptOrgPointer)
          log("FAIL!");
        t._lastCodePointer = t._scriptOrgPointer.newRelativeStream();
      break;
      default:
        log("Unknown script location "+slot.where);
      break;
    }
  };

  s.getScriptEntryPoint = function() {
    var t = this, offset;
    if(t._currentScript == 0xFF)
      return;
    if(t._scriptOrgPointer.offset > 0)
      t._scriptPointer = t._scriptOrgPointer.newRelativeStream(t._vm.slot[t._currentScript].offs - t._scriptOrgPointer.offset);
    else
      t._scriptPointer = t._scriptOrgPointer.newRelativeStream(t._vm.slot[t._currentScript].offs);
  };

  s.getVerbEntryPoint = function(obj, entry) {
  };

  s.executeScript = function() {
    var t = this;
    var slot = t._vm.slot[t._currentScript];

    while(t._currentScript != 0xFF) {
      if(t._scriptPointer.offset >= t._scriptPointer.length) {
        error("Script out of bounds");
        log(t._scriptPointer.offset);
        slot.number = 0;
        slot.status = "dead";
        t._currentScript = 0xFF;
        return;
      }
      slot = t._vm.slot[t._currentScript];
      t._opcode = t.fetchScriptByte();
      slot.didexec = true;

      // debug(5, "executing opcode 0x"+t._opcode.toString(16));
      t.executeOpcode(t._opcode);
    }
  };

  s.executeOpcode = function(i) {
    var t = this,
        opcodes = t._opcodes;
    if(opcodes[i]) {
      t._opcode = i;

      // log("Executing opcode 0x"+i.toString(16)+" at 0x"+(t._scriptPointer.offset).toString(16)+" in script "+t._vm.slot[t._currentScript].number);
      opcodes[i]();
    } else {
      log("Invalid opcode 0x"+i.toString(16)+" at 0x"+t._scriptPointer.offset.toString(16)+" stopping execution of script "+t._vm.slot[t._currentScript].number);
      t._vm.slot[t._currentScript].status = "dead";
      t._currentScript = 0xFF;
    }
  };

  s.setupScummVars = function() {
    var t = this;
    t._vars = {
      keypress: 0,
      ego: 1,
      camera_pos_x: 2,
      have_msg: 3,
      room: 4,
      override: 5,
      machine_speed: 6,
      num_actor: 8,
      current_lights: 9,
      currentdrive: 10,
      tmr_1: 11,
      tmr_2: 12,
      tmr_3: 13,
      music_timer: 14,
      actor_range_min: 15,
      actor_range_max: 16,
      camera_min_x: 17,
      camera_max_x: 18,
      timer_next: 19,
      virt_mouse_x: 20,
      virt_mouse_y: 21,
      room_resource: 22,
      last_sound: 23,
      cutseneexit_key: 24,
      talk_actor: 25,
      camera_fast_x: 26,
      scroll_script: 27,
      entry_script: 28,
      entry_script2: 29,
      exit_script: 30,
      exit_script2: 31,
      verb_script: 32,
      sentence_script: 33,
      inventory_script: 34,
      cutscene_start_script: 35,
      cutscene_end_script: 36,
      charinc: 37,
      walkto_obj: 38,
      debugmode: 39,
      heapspace: 40,
      restart_key: 42,
      pause_key: 43,
      mouse_x: 44,
      mouse_y: 45,
      timer: 46,
      timer_total: 47,
      soundcard: 48,
      videomode: 49,
      mainmenu_key: 50,
      fixeddisk: 51,
      cursorstate: 52,
      userput: 53,
      talk_string_y: 54,
      soundresult: 56,
      talkstop_key: 57,
      fade_delay: 59,
      nosubtitles: 60,
      soundparam: 64,
      soundparam2: 65,
      soundparam3: 66,
      inputmode: 67,
      memory_performance: 68,
      video_performance: 69,
      room_flag: 70,
      game_loaded: 71,
      new_room: 72
    };
  };

  s.resetScummVars = function() {
    var t = this,
        vm = t._vm;

    vm.numNestedScripts = 0;
    t._currentScript = 0xFF;
    t._currentRoom = 0;
    t.scummVar("talk_string_y", -0x50);
    t.scummVar("videomode", 19);
    t.scummVar("fixeddisk", 1);
    t.scummVar("inputmode", 3);

    t.scummVar("debugmode", t._debugMode);
    t.scummVar("fade_delay", 3);
    t.scummVar("charinc", 4);
    t.scummVar("machine_speed", 0xFF);

    t.setTalkingActor(0);

    // Setup Light
    t._scummVars[74] = 1225; // Monkey1 specific
  };

  s.getObjectIndex = function(obj) {
    var t = this, i;
    if(obj < 1)
      return -1;
    for(i = t._objs.length; i > 0; i--) {
      if(t._objs[i] && t._objs[i].obj_nr == obj)
        return i;
    }
    return -1;
  };

  s.getObjectXYPos = function(object) {
    var idx = s.getObjectIndex(object), od = s._objs[idx], pos = _system.Point(od.walk_x, od.walk_y);
    pos.dir = _system.oldDirToNewDir(od.actordir & 3);

    return pos;
  };

  s.getOwner = function(obj) {
    var t = this;
    return t._objectOwnerTable[obj];
  };

  s.putOwner = function(obj, owner) {
    var t = this;
    t._objectOwnerTable[obj] = owner;
  };

  s.getState = function(obj) {
    var t = this;
    return t._objectStateTable[obj];
  };

  s.putState = function(obj, state) {
    var t = this;
    t._objectStateTable[obj] = state;
  };

  s.jumpRelative = function(cond) {
    var t = this, offset = t.fetchScriptWordSigned();
    if(!cond) {
      t._scriptPointer.seek(offset);
    }
  };

  s.push = function(a) {
    var t = this;
    t._vmstack[t._scummStackPos++] = a;
  };

  s.pop = function() {
    var t = this;
    return t._vmstack[--t._scummStackPos];
  };

  s.stopObjectCode = function() {
    var t = this, slot = t._vm.slot[t._currentScript];

    if(slot.where != "global" && slot.where != "local") {
      t.stopObjectScript(slot.number);
    } else {
      slot.number = 0;
      slot.status = "dead";
    }
    t._currentScript = 0xFF;
  };

  s.resStrLen = function(stream) {
    var t = this, chr, num = 0;
    if(!stream)
      stream = t._scriptPointer;
    seekStream = stream.newRelativeStream(0);
    while((chr = seekStream.readUI8()) != 0) {
      num++;
    }
    return num;
  };

  s.getResultPos = function() {
    var t = this, a;
    t._resultVarNumber = t.fetchScriptWord();
    if(t._resultVarNumber & 0x2000) {
      a = t.fetchScriptWord();
      if(a & 0x2000) {
        t._resultVarNumber += t.readVar(a & ~0x2000);
      } else {
        t._resultVarNumber &= ~0x2000;
      }
    }
  };

  s.readVar = function(varId) {
    var t = this, a;
    if(varId & 0x2000) {
      a = t.fetchScriptWord();
      if(a & 0x2000)
        varId += t.readVar(a & ~0x2000);
      else
        varId += a & 0xFFF;
      varId &= ~0x2000;
    }
    if(!(varId & 0xF000)) {
      return t._scummVars[varId];
    }
    if(varId & 0x8000) {
      varId &= 0x7FFF;
      return (t._bitVars[varId >> 3] & (1 << (varId & 7))) ? 1 : 0;
    }
    if(varId & 0x4000) {
      varId &= 0xFFF;
      return t._vm.localvar[t._currentScript][varId];
    }
    return -1;
  };

  s.writeVar = function(varId, value) {
    var t = this;
    if(!(varId & 0xF000)) {
      t._scummVars[varId] = value;
    }
    if(varId & 0x8000) {
      varId &= 0x7FFF;
      if(value)
        t._bitVars[varId >> 3] |= (1 << (varId & 7));
      else
        t._bitVars[varId >> 3] &= ~(1 << (varId & 7));
    }
    if(varId & 0x4000) {
      varId &= 0xFFF;
      t._vm.localvar[t._currentScript][varId] = value;
    }
  };

  s.getVar = function() {
    var t = this, varId = t.fetchScriptWord();
    return t.readVar(varId);
  }

  s.getVarOrDirectByte = function(mask) {
    var t = this;
    if(t._opcode & mask)
      return t.getVar();
    return t.fetchScriptByte();
  };

  s.getVarOrDirectWord = function(mask) {
    var t = this;
    if(t._opcode & mask)
      return t.getVar();
    return t.fetchScriptWordSigned();
  };

  s.getWordVararg = function() {
    var t = this, data = [], i;

    for(i = 0; i < 16; i++) {
      data[i] = String.fromCharCode(0);
    }

    i = 0;
    while((t._opcode = t.fetchScriptByte()) != 0xFF) {
      data[i++] = t.getVarOrDirectWord(PARAM_1);
    }
    return data;
  }

  s.setResult = function(value) {
    var t = this;
    t.writeVar(t._resultVarNumber, value);
  };

  s.updateCodePointer = function() {
    var t = this;

    if(t._lastCodePointer.offset != t._scriptOrgPointer.offset) {
      oldoffs = t._scriptPointer.offset;
      t.getScriptBaseAddress();
      t._scriptPointer.seek(oldoffs);
    }
  }

  s.fetchScriptByte = function() {
    this.updateCodePointer();
    var t = this, b = t._scriptPointer;
    return b.readUI8();
  };

  s.fetchScriptWord = function() {
    this.updateCodePointer();
    var t = this, b = t._scriptPointer;
    return b.readUI16();
  };

  s.fetchScriptWordSigned = function() {
    this.updateCodePointer();
    var t = this, b = t._scriptPointer;
    return b.readSI16();
  };

  s.fetchScriptDWord = function() {
    this.updateCodePointer();
    var t = this, b = t._scriptPointer;
    return b.readUI32();
  };

  s.fetchScriptDWordSigned = function() {
    this.updateCodePointer();
    var t = this, b = t._scriptPointer;
    return b.readSI32();
  };

  s.convertMessageToString = function(msg) {
    var t = this, dst = "", i, chr;

    if(!msg) return;

    for(i = 0; i < msg.length; i++) {
      chr = msg.charCodeAt(i);
      if(chr == 0) break;
      if(chr == 0xFF) {
        chr = msg.charCodeAt(++i);
        if(chr == 1 || chr == 2 || chr == 3 || chr == 8) {
          dst += String.fromCharCode(0xFF);
          dst += String.fromCharCode(chr);
        } else {
          log("special string codes");
        }
      } else {
        if(String.fromCharCode(chr) != "@")
          dst += String.fromCharCode(chr);
      }
    }
    return dst;
  };

  s.printString = function(slot, source, len) {
    var t = this, msg = s.convertMessageToString(source.readString(len));
    switch(slot) {
      case 0:
        if(!s._actorToPrintStrFor) s._actorToPrintStrFor = s.scummVar("ego");
        s.actorTalk(msg);
      break;
      case 1:
        drawString(1, msg);
      break;
      default:
        log("unimplemented string slot "+slot);
    }
  };

  s.beginOverride = function() {
    var t = this, vm = t._vm, idx = vm.cutSceneStackPointer;
    vm.cutScenePtr[idx] = t._scriptPointer.offset;
    vm.cutSceneScript[idx] = t._currentScript;
    log("begin override");

    t.fetchScriptByte();
    t.fetchScriptWord();
    t.scummVar("override", 0);
  };

  s.endOverride = function() {
    var t = this, vm = t._vm, idx = vm.cutSceneStackPointer;

    log("ending override");
    vm.cutScenePtr[idx] = 0;
    vm.cutSceneScript[idx] = null;
    t.scummVar("override", 0);
  };

  s.beginCutscene = function(args) {
    var t = this, scr = t._currentScript, vm = t._vm;
    vm.slot[scr].cutsceneOverride++;
    vm.cutSceneStackPointer++;
    vm.cutSceneData[vm.cutSceneStackPointer] = args[0];
    vm.cutSceneScript[vm.cutSceneStackPointer] = 0;
    vm.cutScenePtr[vm.cutSceneStackPointer] = 0;

    vm.cutSceneScriptIndex = scr;
    if(t.scummVar("cutscene_start_script"))
      t.runScript(t.scummVar("cutscene_start_script"), 0, 0, args);
    vm.cutSceneScriptIndex = 0xFF;
  };

  s.endCutscene = function() {
    var t = this, vm = t._vm, slot = vm.slot[t._currentScript], args = [];

    if(slot.cutsceneOverride > 0)
      slot.cutsceneOverride--;
    for(var i = 0; i < 16; i++) { args[i] = 0; }
    args[0] = vm.cutSceneData[vm.cutSceneStackPointer];
    t.scummVar("override", 0);
    log("end cutscene");
    if(vm.cutScenePtr[vm.cutSceneStackPointer] && slot.cutsceneOverride > 0)
      slot.cutsceneOverride--;

    vm.cutSceneScript[vm.cutSceneStackPointer] = 0;
    vm.cutScenePtr[vm.cutSceneStackPointer] = 0;
    vm.cutSceneStackPointer--;

    if(t.scummVar("cutscene_end_script")) {
      log("running cutscene_end_script "+t.scummVar("cutscene_end_script"));
      t.runScript(t.scummVar("cutscene_end_script"), 0, 0, args);
    }
  };

  s.abortCutscene = function() {
    var t = this, vm = t._vm, slot, args = [], idx = vm.cutSceneStackPointer, offs = vm.cutScenePtr[idx];

    if(offs) {
      log("aborting cutscene "+idx+" at "+offs+" script "+vm.cutSceneScript[idx]);
      slot = vm.slot[vm.cutSceneScript[idx]];
      slot.offs = offs;
      slot.status = "running";
      slot.freezeCount = 0;
      if(slot.cutSceneOverride > 0)
        slot.cutSceneOverride--;

      t.scummVar("override", 1);
      vm.cutScenePtr[idx] = 0
    }
    log("aborted cutscene");
  };

  s.decodeParseString = function() {
    var t = this, textSlot, len, text;

    switch(t._actorToPrintStrFor) {
    case 252:
      textSlot = 3;
    break;
    case 253:
      textSlot = 2;
    break;
    case 254:
      textSlot = 1;
    break;
    default:
      textSlot = 0;
    break;
    }
    t._string[textSlot] = {x: 0, y: 0, right: 0, align: "left", color: 0, text:"", overhead: true, wrapping: false, no_talk_anim: true};
    text = t._string[textSlot];
    while((t._opcode = t.fetchScriptByte()) != 0xFF) {
      switch(t._opcode & 0x0F) {
        case 0: // at
          text.x = t.getVarOrDirectWord(PARAM_1);
          text.y = t.getVarOrDirectWord(PARAM_2);
        break;
        case 1: // color
          text.color = t.getVarOrDirectByte(PARAM_1);
        break;
        case 2: // clipped
          text.right = t.getVarOrDirectWord(PARAM_1);
        break;
        case 3: // erase
          w = t.getVarOrDirectWord(PARAM_1);
          h = t.getVarOrDirectWord(PARAM_2);
        break;
        case 4: // center
          text.align = "center";
          text.overhead = false;
        break;
        case 7: // overhead
          text.overhead = true;
        break;
        case 15: // textstring
          len = t.resStrLen();
          var old_off = t._scriptPointer.offset;
          t.printString(textSlot, t._scriptPointer, len);
          t._scriptPointer.seek(1);
        return;
        default:
          log("unimplemented decodeParseString opcode " + (s._opcode & 0x0F));
        break;
      }
    }
  };

  var unimplementedOpcode = function() {
    // log("opcode 0x"+s._opcode.toString(16)+" unimplemented");
  };

  s._opcodeCommands = {
    startScript: function() {
      var op, script, data;

      op = s._opcode;
      script = s.getVarOrDirectByte(PARAM_1);
      data = s.getWordVararg();

      s.runScript(script, (op & 0x20) != 0, (op & 0x40) != 0, data);
    },
    startObject: function() {
      var obj = s.getVarOrDirectWord(PARAM_1), script = s.getVarOrDirectByte(PARAM_2), data;

      data = s.getWordVararg();
      // s.runObjectScript(obj, script, 0, 0, data);
    },
    resourceRoutines: function() {
     var resType = ["script", "sound", "costume", "room"], resid = 0;
     s._opcode = s.fetchScriptByte();
     if(s._opcode != 17)
       resid = s.getVarOrDirectByte(PARAM_1);

     var op = s._opcode & 0x3F;
     switch(op) {
       case 1: // load script
       case 2: // load sound
       case 3: // load costume
         s.ensureResourceLoaded(resType[op - 1], resid);
       break;
       case 4: // room
         s.ensureResourceLoaded("room", resid);
         break;
       case 9: // lock script
       break;
       case 10: // lock sound
       break;
       case 11: // lock costume
       break;
       case 13: // unlock script
       break;
       case 15: // unlock costume
       break;
       case 17:
       break;
       case 18: // charset
         s.loadCharset(resid);
       break;
       default:
         log("unimplemented resourceRoutines opcode "+op);
       break;
     }
    },
    move: function() {
      s.getResultPos();
      s.setResult(s.getVarOrDirectWord(PARAM_1));
    },
    cursorCommand: function() {
      s._opcode = s.fetchScriptByte();
      switch(s._opcode & 0x1F) {
        case 1: // on
        case 2: // off
        case 3: // userput on
        case 4: // userput off
        break;
        case 13: // charset set
          no = s.getVarOrDirectByte(PARAM_1);
          // s.initCharset();
        break;
        case 14: // unknown
          table = s.getWordVararg();
          for(var i = 0; i < 16; i++)
            s._charsetColorMap[i] = parseInt(table[i]) ? parseInt(table[i]) : 0;
        break;
        default:
          if(s._opcodeCommands & 0x1F <= 14)
            log("unimplemented cursorCommand opcode " + (s._opcode & 0x1F));
        break;
      }
      s.scummVar("cursorstate", 1);
    },
    setVarRange : function() {
      var a, b;
      s.getResultPos();
      a = s.fetchScriptByte();
      do {
        if(s._opcode & 0x80)
          b = s.fetchScriptWordSigned();
        else
          b = s.fetchScriptByte();
        s.setResult(b);
        s._resultVarNumber++;
      } while(--a);
    },
    stringOps: function() {
      var a, b, c, i;
      s._opcode = s.fetchScriptByte();
      switch(s._opcode & 0x1F) {
        case 1: // loadstring
          a = s.getVarOrDirectByte(PARAM_1);
          s.loadPtrToResource("string", a, null);
        break;
        case 3: // setStringChar
          a = s.getVarOrDirectByte(PARAM_1);
          b = s.getVarOrDirectByte(PARAM_2);
          c = s.getVarOrDirectByte(PARAM_3);
          ptr = s.getResourceAddress("string", a);
          if(!ptr) {
            error("String "+a+" does not exist");
          }
          ptr.buffer[b] = c;
        break;
        case 5: // createString
          a = s.getVarOrDirectByte(PARAM_1);
          b = s.getVarOrDirectByte(PARAM_2);
          if(b) {
            ptr = s._res.createResource("string", a, b, -1);
          }
          ptr = s.getResourceAddress("string", a);
        break;
        default:
          log("unimplemented stringOps opcode " + (s._opcode & 0x1F));
        break;
      }
    },
    roomOps: function() {
      var a = 0, b = 0, c, d, e;
      s._opcode = s.fetchScriptByte();
      switch(s._opcode & 0x1F) {
        case 3: // room screen
          a = s.getVarOrDirectWord(PARAM_1);
          b = s.getVarOrDirectWord(PARAM_2);
          s.initScreens(a, b);
        break;
        case 4: // room palette
          a = s.getVarOrDirectWord(PARAM_1);
          b = s.getVarOrDirectWord(PARAM_2);
          c = s.getVarOrDirectWord(PARAM_3);
          s._opcode = s.getVarOrDirectByte();
          d = s.getVarOrDirectByte(PARAM_1);
          // setPalColor(d, a, b, c);
        break;
        case 10: // room fase
          a = s.getVarOrDirectWord(PARAM_1);
          if(a) {
            // _switchRoomEffect
          } else {
            // fadeIn
          }
        break;
        default:
          log("unimplemented roomOps opcode " + (s._opcode & 0x1F));
        break;
      }
    },
    isEqual: function() {
      var a, b, varId;
      varId = s.fetchScriptWord();
      a = s.readVar(varId);
      b = s.getVarOrDirectWord(PARAM_1);
      s.jumpRelative(b == a);
    },
    isGreater: function() {
      var a = s.getVar(), b = s.getVarOrDirectWord(PARAM_1);
      s.jumpRelative(b > a);
    },
    isGreaterEqual: function() {
      var a = s.getVar(), b = s.getVarOrDirectWord(PARAM_1);
      s.jumpRelative(b >= a);
    },
    isLess: function() {
      var a = s.getVar(), b = s.getVarOrDirectWord(PARAM_1);
      s.jumpRelative(b < a);
    },
    isLessEqual: function() {
      var a = s.getVar(), b = s.getVarOrDirectWord(PARAM_1);
      s.jumpRelative(b <= a);
    },
    isNotEqual: function() {
      var a = s.getVar(), b = s.getVarOrDirectWord(PARAM_1);
      s.jumpRelative(b != a);
    },
    unimplementedOpcode: unimplementedOpcode,
    getActorMoving: function() {
      var act;
      s.getResultPos();
      act = s.getActor(s.getVarOrDirectByte(PARAM_1));
      s.setResult(act.moving);
      log("getActorMoving");
    },
    getActorFacing: function() {
      var act;
      s.getResultPos();
      act = s.getActor(s.getVarOrDirectByte(PARAM_1));
      s.setResult(act.facing);
    },
    stopObjectCode: function() {
      s.stopObjectCode();
    },
    stopScript: function() {
      var script = s.getVarOrDirectByte(PARAM_1);
      if(!script) s.stopObjectCode();
      else s.stopScript(script);
    },
    notEqualZero: function() {
      var a = s.getVar();
      s.jumpRelative(a != 0);
    },
    equalZero: function() {
      var a = s.getVar();
      s.jumpRelative(a == 0);
    },
    expression: function() {
      var dst;
      s._scummStackPos = 0;
      s.getResultPos();
      dst = s._resultVarNumber;
      while((s._opcode = s.fetchScriptByte()) != 0xFF) {
        switch(s._opcode & 0x1F) {
          case 1: // varordirect
            s.push(s.getVarOrDirectWord(PARAM_1));
          break;
          case 2: // add
            i = s.pop();
            s.push(s.pop() + i);
          break;
          case 3: // sub
            i = s.pop();
            s.push(s.pop() - i);
          break;
          case 4: // mul
            i = s.pop();
            s.push(i * s.pop());
          break;
          case 5: // div
            i = s.pop();
            if(i == 0)
              error("Divide by zero");
            s.push(s.pop() / i);
          break;
          case 6: // normal
            s._opcode = s.fetchScriptByte();
            s.executeOpcode(s._opcode);
            s.push(s.scummVar("keypress"));
          break;
          default:
            log("unimplemented expression opcode " + (s._opcode & 0x1F));
          break;
        }
      }
    },
    verbOps: function() {
      var verb

      verb = s.getVarOrDirectByte(PARAM_1);
      slot = 0;
      while((s._opcode = s.fetchScriptByte()) != 0xFF) {
        switch(s._opcode & 0x1F) {
          case 6: // on
          case 7: // off
          case 9: // new
          case 17: // dim
          case 19: // center
          break;
          case 2: // name
            s.loadPtrToResource("verb", slot++);
          break;
          case 5: // verb at
            left = s.getVarOrDirectWord(PARAM_1);
            top = s.getVarOrDirectWord(PARAM_2);
          break;
          case 22: // assign object
            s.getVarOrDirectWord(PARAM_1);
            s.getVarOrDirectByte(PARAM_2);
          break;
          case 3: // verb color
          case 4: // verb hicolor
          case 16: // verb dimcolor
          case 18: // verb key
          case 23: // set back color
            s.getVarOrDirectByte(PARAM_1);
          break;
          default:
            log("unimplemented verbOps opcode " + (s._opcode & 0x1F));
          break;
        }
      }
    },
    wait: function() {
      var oldoffset = s._scriptPointer.offset - 1;

      s._opcode = s.fetchScriptByte();
      switch(s._opcode & 0x1F) {
        case 1: // wait for actor
          var a = s.getActor(s.getVarOrDirectByte(PARAM_1));
          if(a && a.moving) {
            // log("wait for actor "+a.number);
            break;
          }
          // log("done waiting for actor "+a.number);
          return;
        break;
        case 2: // wait for message
          if(s.scummVar("have_msg"))
            break;
          return;
        break;
        default:
          log("unknown wait opcode 0x"+(s._opcode & 0x1F));
      }

      s._scriptPointer.offset = oldoffset;
      s._opcodeCommands.breakHere();
    },
    drawObject: function() {
      var state = 1, obj, idx, i, xpos = 255, ypos = 255, x, y, w, h, od;

      obj = s.getVarOrDirectWord(PARAM_1);
      s._opcode = s.fetchScriptByte();
      switch(s._opcode & 0x1F) {
        case 0:
          xpos = s.getVarOrDirectWord(PARAM_1);
          ypos = s.getVarOrDirectWord(PARAM_2);
          // log("drawObject "+obj+" opcode 0 "+xpos+"/"+ypos);
          return;
        break;
        case 1: // draw at
          xpos = s.getVarOrDirectWord(PARAM_1);
          ypos = s.getVarOrDirectWord(PARAM_2);
        break;
        case 2: // set state
          state = s.getVarOrDirectWord(PARAM_1);
        break;
        case 0x1F:
        break;
        default:
          log("unimplemented drawObject opcode " + (s._opcode & 0x1F));
        break;
      }
      idx = s.getObjectIndex(obj);
      if(idx == -1) return;

      od = s._objs[idx];
      if(xpos != 0xFF) {
        // Pos stuff
      }
      s.addObjectToDrawQueue(idx);

      x = od.x_pos; y = od.y_pos; w = od.width; h = od.height;

      i = s._objs.length - 1;
      do {
        o = s._objs[i];
        if(o && o.obj_nr && o.x_pos == x && o.y_pos == y && o.width == w && o.height == h) {
          s.putState(o.obj_nr, 0);
        }
      } while(--i);
      s.putState(obj, state);
    },
    setState: function() {
      var obj, state;
      obj = s.getVarOrDirectWord(PARAM_1);
      state = s.getVarOrDirectByte(PARAM_2);
      s.putState(obj, state);
      s.markObjectRectAsDirty(obj);
      if(s._bgNeedsRedraw)
        s.clearDrawObjectQueue();
    },
    getActorElevation: function() {
      var act;
      s.getResultPos();
      act = s.getVarOrDirectByte(PARAM_1);
      s.setResult(act.elevation);
    },
    drawBox: function() {
      var x,y,x2,y2, color;
      x = s.getVarOrDirectWord(PARAM_1);
      y = s.getVarOrDirectWord(PARAM_2);
      s._opcode = s.fetchScriptByte();
      x2 = s.getVarOrDirectWord(PARAM_1);
      y2 = s.getVarOrDirectWord(PARAM_2);
      color = s.getVarOrDirectByte(PARAM_3);

      // s.drawBox(x, y, x2, y2, color);
    },
    pseudoRoom: function() {
      var i = s.fetchScriptByte(), j;
      while((j = s.fetchScriptByte()) != 0) {
        if(j >= 0x80) {
          //resourceMapper stuff
        }
      }
    },
    setOwnerOf: function() {
      var obj = s.getVarOrDirectWord(PARAM_1), owner = s.getVarOrDirectByte(PARAM_2);
      // s.setOwnerOf(obj, owner);
    },
    getRandomNr: function() {
      s.getResultPos();
      s.setResult(Math.floor(Math.random()*s.getVarOrDirectByte(PARAM_1)));
    },
    actorOps: function() {
      var a = s.getVarOrDirectByte(PARAM_1), act = s.getActor(a), i, j;

      while((s._opcode = s.fetchScriptByte()) != 0xFF) {
        switch(s._opcode & 0x1F) {
          case 1: // costume
            act.setActorCostume(s.getVarOrDirectByte(PARAM_1));
          break;
          case 2: // step dist
            i = s.getVarOrDirectByte(PARAM_1);
            j = s.getVarOrDirectByte(PARAM_2);
            act.setActorWalkSpeed(i, j);
          break;
          case 4: // walk animation
            act.walkFrame = s.getVarOrDirectByte(PARAM_1);
          break;
          case 5: // talk animation
            act.talkStartFrame = s.getVarOrDirectByte(PARAM_1);
            act.talkStopFrame = s.getVarOrDirectByte(PARAM_2);
          break;
          case 6: // stand animation
            act.standFrame = s.getVarOrDirectByte(PARAM_1);
          break;
          case 7: // animation
            s.getVarOrDirectByte(PARAM_1);
            s.getVarOrDirectByte(PARAM_2);
            s.getVarOrDirectByte(PARAM_3);
          break;
          case 8: // default
            act.initActor(-1); //0);
          break;
          case 11: // palette
            i = s.getVarOrDirectByte(PARAM_1);
            j = s.getVarOrDirectByte(PARAM_2);
            act.setPalette(i, j);
          break;
          case 12: // talk color
            act.talkColor = s.getVarOrDirectByte(PARAM_1);
            log("set talk color "+act.talkColor);
          break;
          case 13: // actor name
            s.loadPtrToResource("actor_name", a);
            log("loaded actor "+a+": "+s.getResourceAddress("actor_name", a).readString());
          break;
          case 17: // actor scale
            i = s.getVarOrDirectByte(PARAM_1);
            j = s.getVarOrDirectByte(PARAM_2);
            act.boxscale = i;
            act.setScale(i, j);
          break;
          case 18: // never zclip
            act.forceClip = 0;
          break;
          case 19: // always zclip
            act.forceClip = s.getVarOrDirectByte(PARAM_1);
          break;
          case 20: // ignore boxes
          case 21: // follow boxes
            act.ignoreBoxes = !(s.opcode & 1);
            act.forceClip = 0;
            if(act.isInCurrentRoom())
              act.putActor();
          break;
          case 0:
          case 3: // sound
          case 15:
          case 16: // actor width
            //unimplemented
          break;
          default:
            log("unimplemented actorOps opcode " + (s._opcode & 0x1F));
          break;
        }
      }
    },
    breakHere: function() {
      s.updateScriptPtr();
      slot = s._vm.slot[s._currentScript];
      s._currentScript = 0xFF;
    },
    jumpRelative: function() {
      s.jumpRelative(false);
    },
    loadRoom: function() {
      var room = s.getVarOrDirectByte(PARAM_1);
      s.startScene(room, 0, 0);
      s._fullRedraw = true;
    },
    print: function() {
      s._actorToPrintStrFor = s.getVarOrDirectByte(PARAM_1);
      s.decodeParseString();
    },
    printEgo: function() {
      s._actorToPrintStrFor = s.scummVar("ego");
      s.decodeParseString();
    },
    putActorInRoom: function() {
      var a = s.getVarOrDirectByte(PARAM_1), act = s.getActor(a), room = s.getVarOrDirectByte(PARAM_2);
      if(!act) { window.console.log("put actor "+a+" into room "+room+" failed"); return; }
      act.room = room;
      act.showActor();
      if(!room)
        act.putActor(0, 0, 0);
    },
    putActor: function() {
      var act = s.getActor(s.getVarOrDirectByte(PARAM_1)), x = s.getVarOrDirectWord(PARAM_2), y = s.getVarOrDirectWord(PARAM_3);
      if(act) act.putActor(x, y);
    },
    actorFollowCamera: function() {
      var a = s.getVarOrDirectByte(PARAM_1), act = s.getActor(a);
      window.console.log(a);
      s.actorFollowCamera(act);
    },
    animateActor: function() {
      var act = s.getActor(s.getVarOrDirectByte(PARAM_1)), anim = s.getVarOrDirectByte(PARAM_2);

      act.animateActor(anim);
    },
    cutscene: function() {
      var args = s.getWordVararg();
      s.beginCutscene(args);
    },
    endCutscene: function() {
      s.endCutscene();
    },
    isScriptRunning: function() {
      s.getResultPos();
      var script = s.getVarOrDirectByte(PARAM_1), running = s.isScriptRunning(script);
      s.setResult(running ? 1 : 0);
    },
    setCameraAt: function() {
      s.setCameraAtEx(s.getVarOrDirectWord(PARAM_1));
      // s._screenEndStrip = s._gdi.numStrips - 1;
    },
    startSound: function() {
      var sound = s.getVarOrDirectByte(PARAM_1);
      s.scummVar("music_timer", 0);
      // addSoundToQueue
    },
    stopSound: function() {
      var sound = s.getVarOrDirectByte(PARAM_1);
      // stopSound
    },
    faceActor: function() {
      var act = s.getActor(s.getVarOrDirectByte(PARAM_1)), obj = s.getVarOrDirectWord(PARAM_2);
      act.faceToObject(obj);
    },
    systemOps: function() {
      var subOp = s.fetchScriptByte();
      switch(subOp) {
        default:
          log("unimplemented systemOps opcode " + subOp);
      }
      // a.faceToObject(obj)
    },
    and: function() {
      var a;
      s.getResultPos();
      a = s.getVarOrDirectWord(PARAM_1);
      s.setResult(s.readVar(s._resultVarNumber) & a);
    },
    getVerbEntryPoint: function() {
      var a, b;
      s.getResultPos();
      a = s.getVarOrDirectWord(PARAM_1);
      b = s.getVarOrDirectWord(PARAM_2);
      s.setResult(s.getVerbEntryPoint(a, b));
    },
    getDist: function() {
      var a, b;
      s.getResultPos();
      a = s.getVarOrDirectWord(PARAM_1);
      b = s.getVarOrDirectWord(PARAM_2);
      // getObjActToObjActDist
      s.setResult(1);
    },
    panCameraTo: function() {
      var a = s.getVarOrDirectWord(PARAM_1);
      // panCameraTo(a, 0);
    },
    pickupObject: function() {
      var obj = s.getVarOrDirectWord(PARAM_1), room = s.getVarOrDirectByte(PARAM_2);
      if(room == 0) room = s._roomResource;
      // addObjectToInventory
      s.putOwner(obj, s.scummVar("ego"));
      // putClass untouchable
      s.putState(obj, 1);
      // object dirty
      s.clearDrawObjectQueue();
      // s.runInventoryScript(1);
    },
    lights: function() {
      var a = s.getVarOrDirectByte(PARAM_1), b = s.fetchScriptByte(), c = s.fetchScriptByte();
      if(c == 0)
        s.scummVar('current_lights', a);
      else if(c == 1) {
        // flashlight
      }
      s._fullRedraw = true;
    },
    increment: function() {
      s.getResultPos();
      s.setResult(s.readVar(s._resultVarNumber) + 1);
    },
    doSentence: function() {
      var verb = s.getVarOrDirectByte(PARAM_1);
      if(verb == 0xFE) {
        s._sentenceNum = 0;
        s.stopScript(s.scummVar("sentence_script"));
        // s.clearClickedStatus();
        return;
      }
      var objectA = s.getVarOrDirectWord(PARAM_2), objectB = s.getVarOrDirectWord(PARAM_3);
      // s.doSetence(ver, objectA, objectB);
    },
    delay: function() {
      var delay = s.fetchScriptByte();
      delay |= s.fetchScriptByte() << 8;
      delay |= s.fetchScriptByte() << 16;
      s._vm.slot[s._currentScript].delay = delay;
      s._vm.slot[s._currentScript].status = "paused";
      s._opcodeCommands.breakHere();
    },
    walkActorTo: function() {
      var a = s.getVarOrDirectByte(PARAM_1),
          act = s.getActor(a),
          x = s.getVarOrDirectWord(PARAM_2),
          y = s.getVarOrDirectWord(PARAM_3);

      act.startWalkActor(x, y, -1);
    },
    walkActorToActor: function() {
      var nr = s.getVarOrDirectByte(PARAM_1),
          nr2 = s.getVarOrDirectByte(PARAM_2),
          dist = s.fetchScriptByte();

      log("walkActorToActor");
    },
    walkActorToObject: function() {
      var a, obj, act, pos;
      a = s.getVarOrDirectByte(PARAM_1);
      obj = s.getVarOrDirectWord(PARAM_2);
      act = s.getActor(a);
      pos = s.getObjectXYPos(obj);
      act.startWalkActor(pos.x, pos.y, pos.dir);
    },
    startMusic: function() {
      var sound = s.getVarOrDirectByte(PARAM_1);
    },
    beginOverride: function() {
      if(s.fetchScriptByte() != 0)
        s.beginOverride();
      else
        s.endOverride();
    },
    getObjectOwner: function() {
      s.getResultPos();
      s.setResult(s.getOwner(s.getVarOrDirectWord(PARAM_1)));
    },
    getObjectState: function() {
      s.getResultPos();
      s.setResult(s.getState(s.getVarOrDirectWord(PARAM_1)));
    },
    chainScript: function() {
      var vm = s._vm, script, cur, vars;
      script = s.getVarOrDirectByte(PARAM_1);
      vars = s.getWordVararg();
      cur = s._currentScript;
      vm.slot[cur].number = 0;
      vm.slot[cur].status = "dead";
      s._currentScript = 0xFF;
      s.runScript(script, vm.slot[cur].freezeResistant, vm.slot[cur].recursive, vars);
    },
    saveRestoreVerbs: function() {
      var a, b, c;
      s._opcode = s.fetchScriptByte();
      a = s.getVarOrDirectByte(PARAM_1);
      b = s.getVarOrDirectByte(PARAM_2);
      c = s.getVarOrDirectByte(PARAM_3);
    },
    setClass: function() {
      var obj = s.getVarOrDirectWord(PARAM_1), newClass;

      while((s._opcode = s.fetchScriptByte()) != 0xFF) {
        newClass = s.getVarOrDirectWord(PARAM_1);
        if(newClass == 0) {
          // all class data
        } else {
        }
      }
    },
    add: function() {
      var a;
      s.getResultPos();
      a = s.getVarOrDirectWord(PARAM_1);
      s.setResult(s.readVar(s._resultVarNumber) + a);
    },
    subtract: function() {
      var a;
      s.getResultPos();
      a = s.getVarOrDirectWord(PARAM_1);
      s.setResult(s.readVar(s._resultVarNumber) - a);
    },
    freezeScripts: function() {
      var scr = s.getVarOrDirectByte(PARAM_1);
      if(scr != 0) s.freezeScripts(scr);
      else s.unfreezeScripts();
    },
    isSoundRunning: function() {
      var snd;
      s.getResultPos();
      snd = s.getVarOrDirectByte(PARAM_1);
      // isSoundRunning
      s.setResult(0);
    },
    getActorRoom: function() {
      var act;
      s.getResultPos();
      act = s.getActor(s.getVarOrDirectByte(PARAM_1));
      if(act) s.setResult(act.room);
      else s.setResult(0);
    },
    soundKludge: function() {
      var items;
      items = s.getWordVararg();
      // soundKludge
    },
    setObjectName: function() {
      var obj = s.getVarOrDirectWord(PARAM_1);
      // s.setObjectName(obj);
    },
    findObject: function() {
      var x, y;
      s.getResultPos();
      x = s.getVarOrDirectByte(PARAM_1);
      y = s.getVarOrDirectByte(PARAM_2);
      s.setResult(0); // findObject(x, y);
    },
    actorFromPos: function() {
      s.getResultPos();
      x = s.getVarOrDirectByte(PARAM_1);
      y = s.getVarOrDirectByte(PARAM_2);
      s.setResult(0); // findObject(x, y);
    }
  };

  s._opcodes = {
    0x00: s._opcodeCommands.stopObjectCode,
    0x01: s._opcodeCommands.putActor,
    0x02: s._opcodeCommands.startMusic,
    0x03: s._opcodeCommands.getActorRoom,
    0x05: s._opcodeCommands.drawObject,
    0x06: s._opcodeCommands.getActorElevation,
    0x07: s._opcodeCommands.setState,
    0x08: s._opcodeCommands.isNotEqual,
    0x09: s._opcodeCommands.faceActor,
    0x0a: s._opcodeCommands.startScript,
    0x0b: s._opcodeCommands.getVerbEntryPoint,
    0x0c: s._opcodeCommands.resourceRoutines,
    0x0f: s._opcodeCommands.getObjectState,
    0x10: s._opcodeCommands.getObjectOwner,
    0x11: s._opcodeCommands.animateActor,
    0x12: s._opcodeCommands.panCameraTo,
    0x13: s._opcodeCommands.actorOps,
    0x14: s._opcodeCommands.print,
    0x16: s._opcodeCommands.getRandomNr,
    0x17: s._opcodeCommands.and,
    0x18: s._opcodeCommands.jumpRelative,
    0x19: s._opcodeCommands.doSentence,
    0x1a: s._opcodeCommands.move,
    0x1c: s._opcodeCommands.startSound,
    0x20: s._opcodeCommands.unimplementedOpcode,
    0x25: s._opcodeCommands.pickupObject,
    0x29: s._opcodeCommands.setOwnerOf,
    0x2a: s._opcodeCommands.startScript,
    0x2c: s._opcodeCommands.cursorCommand,
    0x2d: s._opcodeCommands.putActorInRoom,
    0x2e: s._opcodeCommands.delay,
    0x26: s._opcodeCommands.setVarRange,
    0x27: s._opcodeCommands.stringOps,
    0x28: s._opcodeCommands.equalZero,
    0x32: s._opcodeCommands.setCameraAt,
    0x33: s._opcodeCommands.roomOps,
    0x37: s._opcodeCommands.startObject,
    0x38: s._opcodeCommands.isLessEqual,
    0x3a: s._opcodeCommands.subtract,
    0x3c: s._opcodeCommands.stopSound,
    0x40: s._opcodeCommands.cutscene,
    0x42: s._opcodeCommands.chainScript,
    0x44: s._opcodeCommands.isLess,
    0x46: s._opcodeCommands.increment,
    0x48: s._opcodeCommands.isEqual,
    0x49: s._opcodeCommands.faceActor,
    0x4a: s._opcodeCommands.startScript,
    0x4c: s._opcodeCommands.soundKludge,
    0x4d: s._opcodeCommands.walkActorToActor,
    0x4f: s._opcodeCommands.unimplementedOpcode,
    0x52: s._opcodeCommands.actorFollowCamera,
    0x53: s._opcodeCommands.actorOps,
    0x54: s._opcodeCommands.setObjectName,
    0x56: s._opcodeCommands.getActorMoving,
    0x58: s._opcodeCommands.beginOverride,
    0x5a: s._opcodeCommands.add,
    0x5d: s._opcodeCommands.setClass,
    0x60: s._opcodeCommands.freezeScripts,
    0x62: s._opcodeCommands.stopScript,
    0x63: s._opcodeCommands.getActorFacing,
    0x65: s._opcodeCommands.unimplementedOpcode,
    0x68: s._opcodeCommands.isScriptRunning,
    0x69: s._opcodeCommands.setOwnerOf,
    0x70: s._opcodeCommands.lights,
    0x72: s._opcodeCommands.loadRoom,
    0x74: s._opcodeCommands.getDist,
    0x76: s._opcodeCommands.walkActorToObject,
    0x78: s._opcodeCommands.isGreater,
    0x7a: s._opcodeCommands.verbOps,
    0x7c: s._opcodeCommands.isSoundRunning,
    0x80: s._opcodeCommands.breakHere,
    0x81: s._opcodeCommands.putActor,
    0x83: s._opcodeCommands.getActorRoom,
    0x88: s._opcodeCommands.isNotEqual,
    0x89: s._opcodeCommands.faceActor,
    0x8a: s._opcodeCommands.startScript,
    0x91: s._opcodeCommands.animateActor,
    0x93: s._opcodeCommands.actorOps,
    0x96: s._opcodeCommands.getRandomNr,
    0x98: s._opcodeCommands.systemOps,
    0x9a: s._opcodeCommands.move,
    0x9e: s._opcodeCommands.walkActorTo,
    0xa0: s._opcodeCommands.stopObjectCode,
    0xa8: s._opcodeCommands.notEqualZero,
    0xab: s._opcodeCommands.saveRestoreVerbs,
    0xac: s._opcodeCommands.expression,
    0xad: s._opcodeCommands.putActorInRoom,
    0xae: s._opcodeCommands.wait,
    0xb6: s._opcodeCommands.walkActorToObject,
    0xc0: s._opcodeCommands.endCutscene,
    0xc1: s._opcodeCommands.putActor,
    0xc4: s._opcodeCommands.isLess,
    0xcc: s._opcodeCommands.pseudoRoom,
    0xd1: s._opcodeCommands.animateActor,
    0xd2: s._opcodeCommands.actorFollowCamera,
    0xd5: s._opcodeCommands.actorFromPos,
    0xd8: s._opcodeCommands.printEgo,
    0xe1: s._opcodeCommands.putActor,
    0xe8: s._opcodeCommands.isScriptRunning,
    0xed: s._opcodeCommands.putActorInRoom,
    0xf5: s._opcodeCommands.findObject,
    0xfa: s._opcodeCommands.verbOps,
    0xff: s._opcodeCommands.drawBox
  };

}());

 // E N D      src="src/engines/script.js"

// S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/engines/room.js"
 (function() {
  var _system = ScummVM.system,
      s = ScummVM.engines.SCUMM;

  s.RoomHeader = function(stream) {
    var t = this;
    t.width = 0; t.height = 0; t.numObjects = 0;
    t.stream = stream;
    if(t.stream) {
      t.width = t.stream.readUI16();
      t.height = t.stream.readUI16();
      t.numObjects = t.stream.readUI16();
    }
  };

  s.CodeHeader = function(stream) {
    var t = this;
    t.obj_id = 0; t.x = 0; t.y = 0; t.w = 0; t.h = 0;
    t.flags = 0; t.parent = 0; t.walk_x = 0; t.walk_y = 0;
    t.actordir = 0;
    if(stream) {
      t.obj_id = stream.readUI16(); t.x = stream.readUI8(); t.y = stream.readUI8(); t.w = stream.readUI8(); t.h = stream.readUI8();
      t.flags = stream.readUI8(); t.parent = stream.readUI8(); t.walk_x = stream.readUI16(); t.walk_y = stream.readUI16();
      t.actordir = stream.readUI8();
    }
  };

  s.ImageHeader = function(stream) {
    var t = this;
    t.obj_id = 0; t.image_count = 0; t.flags = 0;
    t.width = 0; t.height = 0; t.hotspot_num = 0;
    t.hotspot = [];
    if(stream) {
      t.obj_id = stream.readUI16(); t.image_count = stream.readUI16();
      stream.readUI16(); // unk
      t.flags = stream.readUI8();
      stream.readUI8(); // unk1
      stream.readUI16(); stream.readUI16(); // unk2
      t.width = stream.readUI16(); t.height = stream.readUI16();
      t.hotspot_num = stream.readUI16();
      for(var i = 0; i < 15; i++) {
        var x = stream.readUI16(), y = stream.readUI16();
        t.hotspot[i] = [x, y];
      }
    }
  };

  s.startScene = function(room, actor, objectNr) {
    var t = this, slot;

    log("Start scene "+room+" (old room "+t._currentRoom+")");
    // fadeOut
    slot = t.getScriptSlot(t._currentScript);
    if(t._currentScript != 0xFF) {
      if(slot.where == "room" || slot.where == "flobject" || slot.where == "local") {
        t._currentScript = 0xFF;
      }
    }

    t.scummVar("new_room", room);

    t.runExitScript();
    t.killScriptsAndResources();
    t.clearDrawQueues();
    // hideActors
    t.scummVar("room", room);
    t._fullRedraw = true;
    t._currentRoom = room;
    t._roomResource = room;
    t.scummVar("room_resource", t._roomResource);

    if(room != 0)
      t.ensureResourceLoaded("room", room);
    // clearRoomObjects

    if(t._currentRoom == 0)
      return;

    t.setupRoomSubBlocks();
    t.resetRoomSubBlocks();
    t.initBGBuffers(t._roomHeight)
    t.resetRoomObjects();
    // setCamera
    if(t._roomResource == 0)
      return;

    t.showActors();
    t.runEntryScript();
  };

  s.setupRoomSubBlocks = function() {
    var t = this, i, roomptr, rmhd, ptr, rmim, searchptr, id, trans,
        MKID_BE = _system.MKID_BE;

    t._gfx = {ENCD: 0, EXCD:0, EPAL:0, CLUT:0, PALS:0};

    roomptr = t.getResourceAddress("room", t._roomResource);
    if(!roomptr) error("Room "+t._roomResource_+" data not found");

    rmhd = new t.RoomHeader(t.findResourceData(MKID_BE("RMHD"), roomptr));
    t._roomWidth = rmhd.width;
    t._roomHeight = rmhd.height;
    t._numObjectsInRoom = rmhd.numObjects;


    rmim = t.findResource(MKID_BE("RMIM"), roomptr);
    t._gfx["IM00"] = t.findResource(MKID_BE("IM00"), rmim);

    ptr = t.findResource(MKID_BE("EXCD"), roomptr);
    if(ptr) t._gfx["EXCD"] = ptr;

    ptr = t.findResource(MKID_BE("ENCD"), roomptr, true);
    if(ptr) t._gfx["ENCD"] = ptr;

    // local scripts
    searchptr = roomptr.newRelativeStream(8);
    while(searchptr.findNext(MKID_BE("LSCR"))) {
      // searchptr.seek(8);
      id = searchptr.readUI8();
      searchptr.seek(-5);
      var size = searchptr.readUI32(true);
      t._localScriptOffsets[id - t._nums['global_scripts']] = searchptr.offset + 1;
      searchptr.seek(size - 8);
    }

    ptr = t.findResourceData(MKID_BE("CLUT"), roomptr);
    if(ptr) t._gfx["CLUT"] = ptr;

    ptr = t.findResourceData(MKID_BE("TRNS"), roomptr);
    if(ptr) trans = ptr.readUI8();
    else trans = 255;

    // gdi roomChanged
    t._gdi.transparentColor = trans;

  };

  s.resetRoomSubBlocks = function() {
    var t = this;

    t.setCurrentPalette(0);
  };

  s.resetRoomObjects = function() {
    var t = this, i, j, od, ptr, obim_id, room, searchptr, cdhd, MKID_BE = ScummVM.system.MKID_BE;

    room = t.getResourceAddress("room", t._roomResource);
    if(t._numObjectsInRoom == 0) return;
    searchptr = room.newRelativeStream(8);
    for(i = 0; i < t._numObjectsInRoom; i++) {
      od = t._objs[t.findLocalObjectSlot()];
      if(searchptr.findNext(MKID_BE('OBCD'))) {
        od.OBCDoffset = searchptr.offset - 8;
        cdhd = t.findResourceData(MKID_BE('CDHD'), searchptr.newRelativeStream(-8));
        od.obj_nr = cdhd.readUI16();
      } else
        break;
    }

    searchptr = room.newRelativeStream(8);
    for(i = 0; i < t._numObjectsInRoom; i++) {
      if(searchptr.findNext(MKID_BE('OBIM'))) {
        obim_id = t.getObjectIdFromOBIM(searchptr);
        for(j = 1; j < t._nums['local_objects']; j++) {
          if(t._objs[j].obj_nr == obim_id) {
            t._objs[j].OBIMoffset = searchptr.offset - 8;
          }
        }
      } else
        break;
    }

    for(i = 1; i < t._nums['local_objects']; i++) {
    // for(i = 1; i < t._objs.length; i++) {
      if(t._objs[i].obj_nr && !t._objs[i].fl_object_index)
        t.resetRoomObject(t._objs[i], room);
    }
  };

  s.resetRoomObject = function(od, room, searchptr) {
    var t = this, cdhd, imhd, MKID_BE = ScummVM.system.MKID_BE;
    if(!searchptr) {
      searchptr = room.newAbsoluteStream(0);
    }
    cdhd = new t.CodeHeader(t.findResourceData(MKID_BE('CDHD'), searchptr.newAbsoluteStream(od.OBCDoffset)));
    if(od.OBIMoffset)
      imhd = new t.ImageHeader(t.findResourceData(MKID_BE('IMHD'), searchptr.newAbsoluteStream(od.OBIMoffset)));

    od.obj_nr = cdhd.obj_id;
    od.width = cdhd.w * 8; od.height = cdhd.h * 8;
    od.x_pos = cdhd.x * 8; od.y_pos = cdhd.y * 8;
    if(cdhd.flags == 0x80) {
      od.parentstate = 1;
    } else {
      od.parentstate = (cdhd.flags & 0xF);
    }
    od.parent = cdhd.parent;
    od.walk_x = cdhd.walk_x; od.walk_y = cdhd.walk_y;
    od.actordir = cdhd.actordir;
    od.fl_object_index = 0;
  }

  s.getObjectIdFromOBIM = function(obim) {
    var t = this, MKID_BE = ScummVM.system.MKID_BE;
    return t.findResourceData(MKID_BE('IMHD'), obim.newRelativeStream(-8)).readUI16();
  };

  s.findLocalObjectSlot = function() {
    var t = this, i, objs = t._objs;
    for(i = 1; i < t._nums['local_objects']; i++) {
      if(!objs[i].obj_nr) {
        objs[i] = new t.ObjectData();
        return i;
      }
    }
    return -1;
  };

}());

 // E N D      src="src/engines/room.js"


// S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/engines/gfx.js"
 (function() {
  var _system = ScummVM.system,
      s = ScummVM.engines.SCUMM;

  var screens = ["main", "text", "verb", "unknown"];
  var MKID_BE = ScummVM.system.MKID_BE;
  var IMxx_tags = [ MKID_BE('IM00'), MKID_BE('IM01'), MKID_BE('IM02'), MKID_BE('IM03'), MKID_BE('IM04'), MKID_BE('IM05'), MKID_BE('IM06'), MKID_BE('IM07'), MKID_BE('IM08'), MKID_BE('IM09'), MKID_BE('IM0A'), MKID_BE('IM0B'), MKID_BE('IM0C'), MKID_BE('IM0D'), MKID_BE('IM0E'), MKID_BE('IM0F'), MKID_BE('IM10') ];
  var zplane_tags = [  MKID_BE('ZP00'), MKID_BE('ZP01'), MKID_BE('ZP02'), MKID_BE('ZP03'), MKID_BE('ZP04') ];

    function debugBitmap(bitmap, w, h) {
      var i = 0, j = 0, out = "", bitmap = bitmap.newRelativeStream(0);
      for(i=0; i < h; i++) {
        var line = i+"  -> ";
        for(j=0; j < w; j++) {
          line += bitmap.readUI8() + " ";
        }
        out += line + "<br />";
      }
      log(out);
    }


  s.VirtScreen = function(n) {
    var t = this;
    this.number = n;
    this.name = screens[n];
    this.topline = 0;
    this.xstart = 0;
    this.backBuf = null;
    this.pixels = null;
    this.pitch = 0;

    t.getPixels = function(x, y) {
      return t.pixels.newRelativeStream(y * t.pitch + (t.xstart + x));
    };

    t.getBackPixels = function(x, y) {
      return t.backBuf.newRelativeStream(y * t.pitch + (t.xstart + x));
    };

  };

  s.Gdi = function(engine) {
    var t = this;
    t.engine = engine;
    t.paletteMod = 0;
    t.roomPalette = engine._roomPalette;
    t.numStrips = 0;
    t.transparentColor = 255;
    t.decomp_shr = 0;
    t.decomp_mask = 0;
    t.vertStripNextInc = 0;
    t.zBufferDisabled = false;
    t.objectMode = false;
    t.numZBuffer = 0;
    t.imgBufOffs = [0, 0, 0, 0, 0, 0, 0, 0];
    t.numStrips = Math.floor(engine._screenWidth / 8);
    
    t.dbAllowMaskOr = 1 << 0;
    t.dbDrawMaskOnAll = 1 << 1;
    t.dbObjectMode = 2 << 2;

    t.drawBitmap = function(src, vs, x, y, width, height, stripnr, numstrip, flag) {
      var vm = t.engine, dst, limit, numstrip, sx, frontBuf, transpStrip, offset;
      var smap_ptr = vm.findResource(_system.MKID_BE("SMAP"), src), tmsk_ptr = vm.findResource(_system.MKID_BE("TMSK"), src), numzbuf = 0, zplane_list = [];

      zplane_list = t.getZPlanes(src, false);
      numzbuf = zplane_list.length;

      t.vertStripNextInc = height * vs.pitch - 1;
      t.objectMode = (flag & t.dbObjectMode) == t.dbObjectMode;

      sx = x - Math.floor(vs.xstart / 8);
      if(sx < 0) {
        numstrip -= -sx;
        x += -sx;
        stripnr += -sx;
        sx = 0;
      }

      limit = Math.floor(Math.max(vm._roomWidth, vs.w) / 8) - x;
      if(limit > numstrip)
        limit = numstrip;
      if(limit > t.numStrips - sx)
        limit = t.numstrips - sx;

      for(k = 0; k < limit; ++k, ++stripnr, ++sx, ++x) {
        offset = y * vs.pitch + (x * 8);
        // adjust vs dirty
        if(vs.number == 0) {
          dst = vs.backBuf.newRelativeStream(offset);
        } else {
          dst = vs.pixels.newRelativeStream(offset);
        }
        transpStrip = t.drawStrip(dst, vs, x, y, width, height, stripnr, smap_ptr);

        if(vs.number == 0) {
          dst = vs.backBuf.newRelativeStream(offset);
          frontBuf = vs.pixels.newRelativeStream(offset);
          t.copy8Col(frontBuf, vs.pitch, dst, height, 1);
        }

        t.decodeMask(x, y, width, height, stripnr, numzbuf, zplane_list, transpStrip, flag, tmsk_ptr);

        // Debug mask
        // var dst1, dst2, mask_ptr, i, h, j, maskbits;
        // for(i = 0; i < numzbuf; i++) {
        //   dst1 = vs.pixels.newRelativeStream(offset);
        //   dst2 = null;
        //   if(vs.number == 0) {
        //     dst2 = vs.backBuf.newRelativeStream(offset);
        //   }
        //   mask_ptr = t.getMaskBuffer(x, y, i);
        //   for(h = 0; h < height - 1; h++) {
        //     maskbits = mask_ptr.readUI8();
        //     // window.console.log("mask x "+x+" y "+h+" "+maskbits.toString(2));
        //     for(j = 0; j < 8; j++) {
        //       if(maskbits & 0x80) {
        //         dst1.writeUI8(12 + i);
        //         // if(dst2) dst2.writeUI8(12);
        //       } else {
        //         dst1.seek(1);
        //         // if(dst2) dst2.seek(1);
        //       }
        //       maskbits <<= 1;
        //     }
        //     dst1.seek(vs.pitch - 8);
        //     mask_ptr.seek(t.numStrips - 1);
        //     // if(dst2) dst2.seek(vs.pitch - 8);
        //   }
        // }
      }
      // debugBitmap(vs.pixels, 320, 200);
    };

    var curStrip = 0;

    t.drawStrip = function(dst, vs, x, y, width, height, stripnr, smap_ptr) {
      var offset = -1, smapLen, headerOffset = smap_ptr.offset, smap = smap_ptr.newRelativeStream(-headerOffset);

      curStrip = stripnr;
      smap.readUI32(true);
      smapLen = smap.readUI32(true);
      if(stripnr * 4 + 8 < smapLen)
        offset = smap.seek(stripnr * 4 + 8, true).readUI32();
      smap.offset = offset;
      return t.decompressBitmap(dst, vs.pitch, smap, height);
    };

    t.getMaskBuffer = function(x, y, z) {
      var buf = t.engine.getResourceAddress("buffer", 9), offset = x + y * t.numStrips + t.imgBufOffs[z];
      buf.seek(0, true);
      return buf.newRelativeStream(offset - 8);
    }

    t.decodeMask = function(x, y, width, height, stripnr, numzbuf, zplane_list, transpStrip, flag, tmsk_ptr) {
      var t = this, i, mask_ptr, z_plane_ptr;

      if(flag & t.dbDrawMaskOnAll) {
      } else {
        for(i = 1; i < numzbuf; i++) {
          var offs, zplane;

          if(!zplane_list[i])
            continue;

          zplane = zplane_list[i].newRelativeStream(stripnr * 2 + 8);
          offs = zplane.readUI16();

          mask_ptr = t.getMaskBuffer(x, y, i);

          if(offs) {
            z_plane_ptr = zplane_list[i].newRelativeStream(offs);
            if(tmsk_ptr) {
              var tmsk = tmsk_ptr.seek(8).readUI16();
              t.decompressTMSK(mask_ptr, tmsk, z_plane_ptr, height);
            } else if(transpStrip && (flag & t.dbAllowMaskOr)) {
              t.decompressMaskImgOr(mask_ptr, z_plane_ptr, height);
            } else {
              t.decompressMaskImg(mask_ptr, z_plane_ptr, height);
            }
          } else {
            if(!(transpStrip && (flag & t.dbAllowMaskOr)))
              for(var h = 0; h < height; h++)
                mask_ptr.seek(h * t.numStrips).writeUI8(0);
          }
        }
      }
    };

    t.decompressMaskImg = function(dst, src, height) {
      var b,c;
      while(height) {
        b = src.readUI8();
        if(b & 0x80) {
          b &= 0x7F;
          c = src.readUI8();
          do {
            dst.writeUI8(c);
            dst.seek(t.numStrips - 1);
            --height;
          } while(--b && height);
        } else {
          do {
            dst.writeUI8(src.readUI8());
            dst.seek(t.numStrips - 1);
            --height;
          } while(--b && height);
        }
      }
    };

    t.decompressBitmap = function(dst, dstPitch, src, numLinesToProcess) {
      var code = src.readUI8(), transpStrip = false;
      t.paletteMod = 0;
      t.decomp_shr = code % 10;
      t.decomp_mask = 0xFF >> (8 - t.decomp_shr);

      switch(code) {
        case 1:
          t.drawStripRaw(dst, dstPitch, src, numLinesToProcess, false);
          debug(5, "drawing strip "+curStrip+" (x offset "+(curStrip*8)+") raw");
        break;
        case 14:
        case 15:
        case 16:
        case 17:
        case 18:
          t.drawStripBasicV(dst, dstPitch, src, numLinesToProcess, false);
          debug(5, "drawing strip "+curStrip+" (x offset "+(curStrip*8)+") basic V");
        break;
        case 24:
        case 25:
        case 26:
        case 27:
        case 28:
          t.drawStripBasicH(dst, dstPitch, src, numLinesToProcess, false);
          debug(5, "drawing strip "+curStrip+" (x offset "+(curStrip*8)+") basic H");
        break;
        case 64:
        case 65:
        case 66:
        case 67:
        case 68:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
          t.drawStripComplex(dst, dstPitch, src, numLinesToProcess, false);
          debug(5, "drawing strip "+curStrip+" (x offset "+(curStrip*8)+") complex");
        break;
        default:
          log("unknown decompressBitmap code "+code);
        break;
      }
      return transpStrip;
    };

    t.drawStripRaw = function(dst, dstPitch, src, height, transpCheck) {
      do {
        for(x = 0; x < 8; x++) {
          color = src.readUI8();
          dst.seek(x);
          if(!transpCheck || color != t.transparentColor)
            t.writeRoomColor(dst, color);
          else
            dst.seek(1);
        }
        dst.seek(dstPitch);
      } while(--height);
    };

    t.writeRoomColor = function(dst, color) {
      c = this.roomPalette[(color + this.paletteMod) & 0xFF];
      dst.writeUI8(c);
    };


    t.drawStripComplex = function(dst, dstPitch, src, height, transpCheck) {
      var t = this, color = src.readUI8(), bits = src.readUI8(), cl = 8, bit, incm, reps;
      var x = 8;
      // return;

      var READ_BIT = function() {
        cl--; bit = bits & 1; bits >>= 1; return bit;
      }, FILL_BITS = function(n) {
        if(cl <= 8) {
          bits |= (src.readUI8() << cl);
          cl += 8;
        }
      };

      var againPos = function() {
        if(!READ_BIT()) {
        } else if(!READ_BIT()) {
          FILL_BITS();
          color = bits & t.decomp_mask;
          bits >>= t.decomp_shr;
          cl -= t.decomp_shr;
        } else {
          incm = (bits & 7) - 4;
          cl -= 3;
          bits >>= 3;
          if(incm) {
            color += incm;
          } else {
            FILL_BITS();
            reps = bits & 0xFF;
            do {
              if(!--x) {
                x = 8;
                height--;
                if(height <= 1)
                  return;
                dst.seek(dstPitch - 8);
              }
              if(!t.transpCheck || color != t.transparentColor)
                t.writeRoomColor(dst, color);
              else
                dst.seek(1);
            } while(--reps);
            bits >>= 8;
            bits |= src.readUI8() << (cl - 8);
            againPos();
          }
        }
      };
      do {
        x = 8;
        do {
          FILL_BITS();
          if(!t.transpCheck || color != t.transparentColor)
            t.writeRoomColor(dst, color);
          else
            dst.seek(1);
          againPos();
        } while(--x);
        if(height > 1)
          dst.seek(dstPitch - 8);
        if(height <= 1) return;
      } while(--height);

    };

    t.drawStripBasicH = function(dst, dstPitch, src, height, transpCheck) {
      var t = this, color = src.readUI8(), bits = src.readUI8(), cl = 8, bit, inc = -1;

      var READ_BIT = function() {
        cl--; bit = bits & 1; bits >>= 1; return bit;
      }, FILL_BITS = function(n) {
        if(cl <= 8) {
          bits |= (src.readUI8() << cl);
          cl += 8;
        }
      };

      do {
        var x = 8;
        do {
          FILL_BITS();
          if(!t.transpCheck || color != t.transparentColor)
            t.writeRoomColor(dst, color);
          else
            dst.seek(1);
          if(!READ_BIT()) {
          } else if(!READ_BIT()) {
            FILL_BITS();
            color = bits & t.decomp_mask;
            bits >>= t.decomp_shr;
            cl -= t.decomp_shr;
            inc = -1;
          } else if(!READ_BIT()) {
            color += inc;
          } else {
            inc = -inc;
            color += inc;
          }
        } while(--x);
        if(height > 1)
          dst.seek(dstPitch - 8);
      } while(--height);
    };

    t.drawStripBasicV = function(dst, dstPitch, src, height, transpCheck) {
      var t = this, color = src.readUI8(), bits = src.readUI8(), cl = 8, bit, inc = -1;

      var READ_BIT = function() {
        cl--; bit = bits & 1; bits >>= 1; return bit;
      }, FILL_BITS = function(n) {
        if(cl <= 8) {
          bits |= (src.readUI8() << cl);
          cl += 8;
        }
      };

      var x = 8;
      do {
        var h = height;
        do {
          FILL_BITS();
          if(!t.transpCheck || color != t.transparentColor)
            t.writeRoomColor(dst, color);
          dst.seek(dstPitch-1, false, true);
          if(!READ_BIT()) {
          } else if(!READ_BIT()) {
            FILL_BITS();
            color = bits & t.decomp_mask;
            bits >>= t.decomp_shr;
            cl -= t.decomp_shr;
            inc = -1;
          } else if(!READ_BIT()) {
            color += inc;
          } else {
            inc = -inc;
            color += inc;
          }
        } while(--h);
        dst.seek(-t.vertStripNextInc, false, true);
      } while(--x);
    };
    t.drawStripBasicH = function(dst, dstPitch, src, height, transpCheck) {
      var t = this, color = src.readUI8(), bits = src.readUI8(), cl = 8, bit, inc = -1;

      var READ_BIT = function() {
        cl--; bit = bits & 1; bits >>= 1; return bit;
      }, FILL_BITS = function(n) {
        if(cl <= 8) {
          bits |= (src.readUI8() << cl);
          cl += 8;
        }
      };

      do {
        var x = 8;
        do {
          FILL_BITS();
          if(!t.transpCheck || color != t.transparentColor)
            t.writeRoomColor(dst, color);
          if(!READ_BIT()) {
          } else if(!READ_BIT()) {
            FILL_BITS();
            color = bits & t.decomp_mask;
            bits >>= t.decomp_shr;
            cl -= t.decomp_shr;
            inc = -1;
          } else if(!READ_BIT()) {
            color += inc;
          } else {
            inc = -inc;
            color += inc;
          }
        } while(--x);
        if(height > 1)
          dst.seek(dstPitch - 8);
      } while(--height);
    };

    t.copy8Col = function(dst, dstPitch, src, height, bitDepth) {
      var i = 0;
      do {
        for(i = 0; i < 8; i++) {
          c = src.readUI8();
          dst.writeUI8(c);
        }
        if(height > 1) {
          dst.seek(dstPitch-8);
          src.seek(dstPitch-8);
        }
      } while(--height);
    };

    t.getZPlanes = function(ptr, bmapImage) {
      var numzbuf, i, vm = t.engine, zplane_list = [];
      if(bmapImage)
        zplane_list[0] = vm.findResource(MKID_BE("BMAP"), ptr);
      else
        zplane_list[0] = vm.findResource(MKID_BE("SMAP"), ptr);

      if(t.zBufferDisabled)
        return [];

      numzbuf = t.numZBuffer;
      for(i = 1; i < numzbuf; i++) {
        zplane_list[i] = vm.findResource(zplane_tags[i], ptr);
      }
      return zplane_list;
    };

    t.resetBackground = function(top, bottom, strip) {
      var vs = s._virtscreens[0], backbuff_ptr, bgbak_ptr, numLinesToProcess;

      if(top < 0) top = 0;
      if(bottom > vs.height) bottom = vs.height;
      if(top >= bottom) return;
      bgbak_ptr = vs.backBuf.newRelativeStream(top * vs.pitch + (strip + vs.xstart/8) * 8);
      backbuff_ptr = vs.pixels.newRelativeStream(top * vs.pitch + (strip + vs.xstart/8) * 8);
      numLinesToProcess = bottom - top;
      if(numLinesToProcess) {
        t.copy8Col(backbuff_ptr, vs.pitch, bgbak_ptr, numLinesToProcess, 1);
      }
    };
  };

  s.initGraphics = function() {
    var t = this,
        ctx = ScummVM.context, width = ScummVM.width, height = ScummVM.height, scale = ScummVM.scale;

    ctx.fillStyle = "black";
    ctx.fillRect(0,0,width,height);

    t._gdi = new t.Gdi(t);
  };

  s.initScreens = function(b, h) {
    var t = this, i, adj = 0,
        width = ScummVM.width, height = ScummVM.height;
    if(!t.getResourceAddress("buffer", 4)) {
      t.initVirtScreen(3, 80, width, 13, false);
    }

    t.initVirtScreen(0, b + adj, width, h, -b, true);
    // t.initVirtScreen("text")
    t.initVirtScreen(2, h + adj, width, height - h - adj, false);
    t._screenB = b;
    t._screenH = h;
  };

  s.initVirtScreen = function(slot, top, width, height, scrollable) {
    var t = this, vs, size,
            res = t._res;

    vs = t._virtscreens[slot];
    if(!vs) {
      vs = new t.VirtScreen(slot);
      t._virtscreens[slot] = vs;
    }
    vs.number = slot;
    vs.w = width;
    vs.topline = top;
    vs.h = height;
    vs.xstart = 0;
    vs.pitch = width;

    size = vs.pitch * vs.h;
    if(scrollable) {
      size += vs.pitch * 4;
    }

    res.createResource("buffer", slot+1, size, -1);
    vs.pixels = t.getResourceAddress("buffer", slot+1);
    if(slot == 0) {
      vs.backBuf = res.createResource("buffer", slot + 5, size, -1);
    }
  };

  s.drawDirtyScreenParts = function() {
    var t = this,
        ctx = ScummVM.context, width = ScummVM.width, height = ScummVM.height, scale = ScummVM.scale;

    ctx.fillStyle = "black";
    ctx.fillRect(0,0,width,height);

    t.updateDirtyScreen(2); // Verb

    if(true) {
      vs = t._virtscreens[0];
      t.drawStripToScreen(vs, 0, vs.w, 0, vs.h);
    } else {
      t.updateDirtyScreen(0); // Main
    }

    t.renderTexts();
  };

  s.updateDirtyScreen = function(n) {
    var t = this, vs = t._virtscreens[n];

  };

  s.drawStripToScreen = function(vs, x, width, top, bottom) {
    var t = this, y, height,
        ctx = ScummVM.context,
        pal = t._currentPalette, i, j, scale = ScummVM.scale;

    if(bottom <= top || top >= vs.h) return;
    if(width > vs.w - x) width = vs.w - x;
    if(top < 0) top = 0;
    if(bottom > t._screenHeight) bottom = t._screenHeight;

    y = vs.topline + top;
    height = bottom - top;

    if(width <= 0 || height <= 0) return;

    src = vs.pixels.newRelativeStream(0);
    // src = (vs.number == 0 ? vs.backBuf : vs.pixels).newRelativeStream(0);
    dst = ctx.getImageData(x, y, width, height);
    var vsPitch = vs.pitch - width, pitch = vs.pitch, h, w;

    i = 0;
    for(h = 0; h < height; h++) {
      for(w = 0; w < width; w++) {
        palcolor = src.readUI8();
        color = pal[palcolor];
        if(color) {
          dst.data[i * 4] = color[0];
          dst.data[i * 4 + 1] = color[1];
          dst.data[i * 4 + 2] = color[2];
        }
        i++;
      }
    }
    ctx.putImageData(dst, x, top);
  };

  s.convertText = function(text) {
    var t = this, i, c, s, result = "";

    for(i = 0; i < text.length; i++) {
      c = text.charCodeAt(i); s = String.fromCharCode(c);
      if(s == '@') continue;
      if(c == 255 || c == 254) {
        i++;
        c = text.charCodeAt(i); s = String.fromCharCode(c);
        if(c == 1) result += '\n';
        else if(c == 2) break;
      }
      else if(c == 0) result += '\n';
      else if(c == 94) result += '\u2026';
      else if(c == 96) result += '"';
      else if(c == 130) result += '\u00E9';
      else if(c == 136) result += '\u00EA';
      else if(c == 250) result += ' '; // nbsp
      else result += String.fromCharCode(c);
    }
    return result;
  };

  s.drawString = function(slot, msg) {
    var text = s._string[slot];
    text.text = msg;
  };

  s.renderTexts = function() {
    var t = this, texts = t._string, i, text, output,
        ctx = ScummVM.context, width = ScummVM.width, height = ScummVM.height;
    for(i = 0; i < texts.length; i++) {
      text = texts[i];
      if(!text || !text.text || text.text == " ") continue;
      if(text.x <= 0) text.x = Math.floor(width / 2);
      if(text.y <= 0) text.y = Math.floor(height * 0.75);
      if(i == 0) {
        ctx.font = "12px Helvetica";
        ctx.textAlign = "center";
      } else {
        ctx.font = "16px Helvetica";
        ctx.textAlign = "center";
      }
      t._charsetColorMap[1] = text.color;
      ctx.fillStyle = t.paletteColor(t._charsetColorMap[text.color]);
      ctx.strokeStyle = "#fff";
      output = t.convertText(text.text).split("\n");
      var y = text.y;
      for(var j = 0; j < output.length; j++) {
        if(ctx.measureText(output[j]).width > width) {
        }
        // ctx.strokeText(output[j], text.x, y, width - text.x);
        ctx.fillText(output[j], text.x, y, width - text.x);
        y += 20;
      }
    }
  }

  s.addObjectToDrawQueue = function(obj) {
    var t = this;
    t._drawObjectQue.push(obj);
  };

  s.clearDrawObjectQueue = function() {
    var t = this;
    t._drawObjectQue = new Array();
  };

  s.clearDrawQueues = function() {
    this.clearDrawObjectQueue();
  };

  s.processDrawQueue = function() {
    var t = this, i, j;
    for(i = 0; i < t._drawObjectQue.length; i++) {
      j = t._drawObjectQue[i];
      if(j) t.drawObject(j, 0);
    }
    t.clearDrawObjectQueue();
  };

  s.drawObject = function(obj, arg) {
    if(this._skipDrawObject) return;
    var t = this, od = t._objs[obj], height, width, ptr, x, a, numstrip, tmp;

    if(t._bgNeedsRedraw) arg = 0;
    if(od.obj_nr == 0) return;

    var xpos = Math.floor(od.x_pos / 8),
        ypos = od.y_pos;

    width = Math.floor(od.width / 8);
    height = od.height &= 0xFFFFFFF8;

    if(width == 0 || xpos > t._screenEndStrip || xpos + width < s._screenStartStrip)
      return;

    ptr = t.getObjectImage(t.getOBIMFromObjectData(od), t.getState(od.obj_nr));
    if(!ptr) return;


    x = 0xFFFF;
    for(a = numstrip = 0; a < width; a++) {
      tmp = xpos + a;
      if(tmp < t._screenStartStrip || t._screenEndStrip < tmp)
        continue;
      if(arg > 0 && t._screenStartStrip + arg <= tmp)
        continue;
      if(arg < 0 && tmp <= t._screenEndStrip + arg)
        continue;
      if(tmp < x)
        x = tmp;
      numstrip++;
    }

    if(numstrip != 0) {
      var flags = od.flags | t._gdi.dbObjectMode;
      t._gdi.drawBitmap(ptr, t._virtscreens[0], x, ypos, width * 8, height, x - xpos, numstrip, flags);
    }
  };

  s.getObjectImage = function(ptr, state) {
    var t = this, im_ptr;
    im_ptr = t.findResource(IMxx_tags[state], ptr);
    return im_ptr;
  }

  s.getOBIMFromObjectData = function(od) {
    var t = this, ptr;
    if(od.fl_object_index) {
      ptr = t.getResourceAddress("fl_object", od.fl_object_index);
      ptr = t.findResource(_system.MKID_BE("OBIM"), ptr);
    } else {
      ptr = t.getResourceAddress("room", t._roomResource);
      ptr.offset = od.OBIMoffset;
      ptr.readUI32(true);
      ptr.offset = od.OBIMoffset;
    }
    return ptr;
  };

  s.markObjectRectAsDirty = function(obj) {
    var t = this;

    t._bgNeedsRedraw = true;
  };

  s.redrawBGStrip = function(start, num) {
    var t = this, strip = t._screenStartStrip + start, room, i;

    //for(i = 0; i < num; i++)
      // setGfxUsageBits DIRTY

    room = t.getResourceAddress("room", t._roomResource);

    t._gdi.drawBitmap(t._gfx["IM00"], t._virtscreens[0], strip, 0, t._roomWidth, t._virtscreens[0].h, strip, num, 0);

  };

  s.redrawBGAreas = function() {
    var t = this, val = 0;
    t.redrawBGStrip(0, t._gdi.numStrips);

    // t.drawRoomObjects(val);
    t._bgNeedsRedraw = false;
  };

  s.initBGBuffers = function(height) {
    var t = this, room, ptr, i, size, itemsize;
    room = t.getResourceAddress("room", t._roomResource);
    ptr = t.findResource(MKID_BE("RMIH"), t.findResource(MKID_BE("RMIM"), room));
    ptr.seek(8);
    t._gdi.numZBuffer = ptr.readUI16() + 1;

    itemsize = (t._roomHeight + 4) * t._gdi.numStrips;
    size = itemsize * t._gdi.numZBuffer;

    t._res.createResource("buffer", 9, size, -1);
    for(i = 0; i < t._gdi.imgBufOffs.length; i++) {
      if(i < t._gdi.numZBuffer)
        t._gdi.imgBufOffs[i] = i * itemsize;
      else
        t._gdi.imgBufOffs[i] = (t._gdi.numZBuffer - 1) * itemsize;
    }
  };

}());

 // E N D      src="src/engines/gfx.js"


// S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/engines/palette.js"
 (function(){
  var _system = ScummVM.system,
      s = ScummVM.engines.SCUMM;

  s.resetPalette = function() {
    s.setDirtyColors(0, 255);
  };

  s.setDirtyColors = function(min, max) {
    var t = this;
    if(t._palDirtyMin > min)
      t._palDirtyMin = min
    if(t._palDirtyMax > max)
      t._palDirtyMax = max
  };

  s.setCurrentPalette = function(palindex) {
    var t = this;
    t._curPalIndex = palindex;
    log("setCurrentPalette");
    pals = t.getPalettePtr(t._curPalIndex, t._roomResource);
    t.setPaletteFromPtr(pals);
  };

  s.getPalettePtr = function(palindex, room) {
    var t = this;
    if(t._gfx["CLUT"]) return t._gfx["CLUT"];
    else error("no clut");
    return null;
  };

  s.setPaletteFromPtr = function(ptr, numcolor) {
    var t = this, firstIndex = 0, i, dest, r, g, b;

    if(!numcolor || numcolor < 0) {
      numcolor = t.getResourceDataSize(ptr) / 3;
    }

    dest = t._currentPalette;
    for(i = firstIndex; i < numcolor; i++) {
      r = ptr.readUI8(); g = ptr.readUI8(); b = ptr.readUI8();
      t._currentPalette[i] = [r,g,b];
    }
  };

  s.paletteColor = function(idx, palette) {
    var t = this, color = "#", i, c, pal_color = (palette ? palette[idx] : t._currentPalette[idx]);

    for(i = 0; i < 3; i++) {
      c = pal_color[0].toString(16)
      color += (c.length == 1 ? "0" + c : c)
    }
    return color;
  }

  s.updatePalette = function() {
  };
}());

 // E N D      src="src/engines/palette.js"

 
 // S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/engines/camera.js"
 (function() {
  var _system = ScummVM.system,
      s = ScummVM.engines.SCUMM;

  s.setCameraAtEx = function(at) {
    var t = this, camera = t._camera;
    camera.mode = "normal";
    log("Moving camera to "+at);
    camera.cur.x = at;
    t.setCameraAt(at, 0);
    camera.movingToActor = false;
    t._fullRedraw = true;
  };

  s.setCameraAt = function(pos_x, pos_y) {
    var t = this, camera = t._camera;
    camera.dest.x = pos_x;
  };

  s.setCameraFollows = function(a, setCamera) {
    var t, i, camera = s._camera;
    if(!a) return;
    camera.mode = "follow_actor";
    camera.follows = a.number;

    if(!a.isInCurrentRoom()) {
      s.startScene(a.room, 0, 0);
      camera.mode = "follow_actor";
      camera.cur.x = a.pos.x;
      s.setCameraAt(camera.cur.x);
    }

    t = Math.floor(a.pos.x / 8) - s._screenStartStrip;

    if(t < camera.leftTrigger || t > camera.rightTrigger || setCamera == true)
      s.setCameraAt(a.pos.x, 0);

    for(j = 1; j < s._actors.length; j++) {
      if(s._actors[j].isInCurrentRoom()) {
        s._actors[j].needRedraw = true;
      }
    }
    // s.runInventoryScript(0);
  };

  s.moveCamera = function() {
    var t = this, camera = t._camera;
    t.cameraMoved();
  };

  s.cameraMoved = function() {
    var t = this, camera = t._camera, screenLeft = 0;

    if(camera.cur.x < (t._screenWidth / 2)) {
      camera.cur.x = Math.floor(t._screenWidth / 2);
    } else if(camera.cur.x > t._roomWidth - (t._screenWidth / 2)) {
      camera.cur.x = t._roomWidth - Math.floor(t._screenWidth / 2);
    }

    t._screenStartStrip = Math.floor(camera.cur.x / 8) - Math.floor(t._gdi.numStrips / 2);
    t._screenEndStrip = t._screenStartStrip + t._gdi.numStrips - 1;
    t._screenTop = 0;
    screenLeft = t._screenStartStrip * 8;
    t._virtscreens[0].xstart = screenLeft;
  };

  s.actorFollowCamera = function(act) {
    var camera = s._camera, old = camera.follows;
    s.setCameraFollows(act);
    if(camera.follows != old)
      ; // s.runInventoryScript(0);
    camera.movingToActor = false;
  }
}());

 // E N D      src="src/engines/camera.js"


// S P L U N K rnd00437_dot_333333
 // B E G I N  src="src/engines/costume.js"
 (function() {
  var _system = ScummVM.system,
      s = ScummVM.engines.SCUMM;

  var MF_NEW_LEG = 1, MF_IN_LEG = 2, MF_TURN = 4, MF_LAST_LEG = 8, MF_FROZEN = 0x80;
  var kObjectClassNeverClip = 20, kObjectClassAlwaysClip = 21, kObjectClassIgoreBoxes = 22, kObjectClassYFlip = 29, kObjectClassXFlip = 30, kObjectClassPlayer = 31, kObjectClassUntoucable = 32;

  var scale_table = [
    0xFF, 0xFD, 0x7D, 0xBD, 0x3D, 0xDD, 0x5D, 0x9D,
    0x1D, 0xED, 0x6D, 0xAD, 0x2D, 0xCD, 0x4D, 0x8D,
    0x0D, 0xF5, 0x75, 0xB5, 0x35, 0xD5, 0x55, 0x95,
    0x15, 0xE5, 0x65, 0xA5, 0x25, 0xC5, 0x45, 0x85,
    0x05, 0xF9, 0x79, 0xB9, 0x39, 0xD9, 0x59, 0x99,
    0x19, 0xE9, 0x69, 0xA9, 0x29, 0xC9, 0x49, 0x89,
    0x09, 0xF1, 0x71, 0xB1, 0x31, 0xD1, 0x51, 0x91,
    0x11, 0xE1, 0x61, 0xA1, 0x21, 0xC1, 0x41, 0x81,
    0x01, 0xFB, 0x7B, 0xBB, 0x3B, 0xDB, 0x5B, 0x9B,
    0x1B, 0xEB, 0x6B, 0xAB, 0x2B, 0xCB, 0x4B, 0x8B,
    0x0B, 0xF3, 0x73, 0xB3, 0x33, 0xD3, 0x53, 0x93,
    0x13, 0xE3, 0x63, 0xA3, 0x23, 0xC3, 0x43, 0x83,
    0x03, 0xF7, 0x77, 0xB7, 0x37, 0xD7, 0x57, 0x97,
    0x17, 0xE7, 0x67, 0xA7, 0x27, 0xC7, 0x47, 0x87,
    0x07, 0xEF, 0x6F, 0xAF, 0x2F, 0xCF, 0x4F, 0x8F,
    0x0F, 0xDF, 0x5F, 0x9F, 0x1F, 0xBF, 0x3F, 0x7F,
    0x00, 0x80, 0x40, 0xC0, 0x20, 0xA0, 0x60, 0xE0,
    0x10, 0x90, 0x50, 0xD0, 0x30, 0xB0, 0x70, 0xF0,
    0x08, 0x88, 0x48, 0xC8, 0x28, 0xA8, 0x68, 0xE8,
    0x18, 0x98, 0x58, 0xD8, 0x38, 0xB8, 0x78, 0xF8,
    0x04, 0x84, 0x44, 0xC4, 0x24, 0xA4, 0x64, 0xE4,
    0x14, 0x94, 0x54, 0xD4, 0x34, 0xB4, 0x74, 0xF4,
    0x0C, 0x8C, 0x4C, 0xCC, 0x2C, 0xAC, 0x6C, 0xEC,
    0x1C, 0x9C, 0x5C, 0xDC, 0x3C, 0xBC, 0x7C, 0xFC,
    0x02, 0x82, 0x42, 0xC2, 0x22, 0xA2, 0x62, 0xE2,
    0x12, 0x92, 0x52, 0xD2, 0x32, 0xB2, 0x72, 0xF2,
    0x0A, 0x8A, 0x4A, 0xCA, 0x2A, 0xAA, 0x6A, 0xEA,
    0x1A, 0x9A, 0x5A, 0xDA, 0x3A, 0xBA, 0x7A, 0xFA,
    0x06, 0x86, 0x46, 0xC6, 0x26, 0xA6, 0x66, 0xE6,
    0x16, 0x96, 0x56, 0xD6, 0x36, 0xB6, 0x76, 0xF6,
    0x0E, 0x8E, 0x4E, 0xCE, 0x2E, 0xAE, 0x6E, 0xEE,
    0x1E, 0x9E, 0x5E, 0xDE, 0x3E, 0xBE, 0x7E, 0xFE
  ];
  var scaletableSize = 128;

  function revBitMask(x) {
    return (0x80 >> (x));
  }

  s.CostumeData = function() {
    var t = this;
    t.active = [];
    t.animCounter = 0;
    t.stopped = 0;
    t.curpos = [];
    t.start = [];
    t.end = [];
    t.frame = [];

    t.reset = function() {
      stopped = 0;
      for(var i = 0; i < 16; i++ ) {
        t.active[i] = 0;
        t.curpos[i] = t.start[i] = t.end[i] = t.frame[i] = 0xFFFF;
      }
    };

    t.reset();
  };

  s.CostumeInfo = function(stream) {
    var t = this;
    t.width = stream.readUI16();
    t.height = stream.readUI16();
    t.rel_x = stream.readSI16();
    t.rel_y = stream.readSI16();
    t.move_x = stream.readSI16();
    t.move_y = stream.readSI16();
  };

  s.Actor = function(id) {
    var t = this;

    t.number = id;
    t.pos = _system.Point(0, 0);
    t.room = 0;
    t.top = t.bottom = 0;
    t.needRedraw = false;
    t.needBgReset = false;
    t.visible = false;
    t.moving = 0;
    t.speedx = 0;
    t.speedy = 0;
    t.frame = 0;
    t.costume = 0;
    t.facing = 180;
    t.elevation = 0;
    t.width = 24;
    t.talkColor = 15;
  t.talkPosX = 0;
    t.talkPosY = -80;
    t.boxscale = t.scaley = t.scalex = 0xFF;
    t.charset = 0;
    t.targetFacing = 0;
    t.layer = 0;
    t.animProgress = 0;
    t.animSpeed = 0;
    t.costumeNeedsInit = true;
    t.palette = [];
    t.forceClip = 0;
    for(var i = 0; i < 256; i++) {
      t.palette[i] = 0;
    }

    t.initFrame = 1;
    t.walkFrame = 2;
    t.standFrame = 3;
    t.talksStartFrame = 4;
    t.talkStopFrame = 5;

    t.walkScript = 0;
    t.talkScript = 0;

    t.cost = new s.CostumeData();

    t.initActor = function(mode) {
      if(mode == -1) { // Reset
        t.top = t.bottom = 0;
        t.needRedraw = false;
        t.needBgReset = false;
        t.costumeNeedsInit = false;
        t.visible = false;
        t.flip = false;
        t.speedx = 8;
        t.speedy = 2;
        t.frame = 0;
        t.walkbox = 0;
        t.animProgress = 0;
        t.cost = new s.CostumeData();
        for(var i = 0; i < 256; i++) {
          t.palette[i] = 0;
        }
      }

      if(mode == 1 || mode == -1) {
        t.costume = 0;
        t.room = 0;
        t.pos = _system.Point(0, 0);
        t.facing = 180;
      } else if(mode == 2) {
        t.facing = 180;
      }

      t.elevation = 0;
      t.width = 24;
      t.talkColor = 15;
      t.talkPosX = 0;
      t.talkPosY = -80;
      t.boxscale = t.scaley = t.scalex = 0xFF;
      t.charset = 0;
      t.targetFacing = t.facing;
      t.layer = 0;

      t.stopActorMoving();
      t.setActorWalkSpeed(8, 2);

      t.animSpeed = 0;

      t.ignoreBoxes = false;
      t.forceClip = 0;
      t.ignoreTurns = false;

      t.talkFrequency = 256;
      t.talkPan = 64;
      t.talkVolume = 127;

      t.initFrame = 1;
      t.walkFrame = 2;
      t.standFrame = 3;
      t.talksStartFrame = 4;
      t.talkStopFrame = 5;

      t.walkScript = 0;
      t.talkScript = 0;

      t.walkdata = {dest: _system.Point(0, 0), destbox: 0, destdir: 0, cur: _system.Point(0, 0), curbox: 0, next: _system.Point(0, 0), point3: _system.Point(32000, 0), deltaXFactor: 0, deltaYFactor: 0, xfrac: 0, yfrac: 0};
    };

    t.classChanged = function(cls, value) {
      if(cls == kObjectClassAlwaysClip)
        t.forceClip = value;
      if(cls == kObjectClassIgoreBoxes)
        t.ignoreBoxes = value;
    };
    t.putActor = function(dstX, dstY, newRoom) {
      t.pos.x = dstX || t.pos.x;
      t.pos.y = dstY || t.pos.y;
      if(newRoom)
        t.room = newRoom;
      t.needRedraw = true;

      if(t.visible) {
        if(t.isInCurrentRoom()) {
          if(t.moving) t.adjustActorPos();
        } else {
          t.hideActor();
        }
      } else {
        if(t.isInCurrentRoom()) t.showActor();
      }
    };
    t.adjustActorPos = function() {
      // var abr = adjustXYToBeInBox(t.pos.x, t.pos.y);
    };
    t.isInCurrentRoom = function() {
      return t.room == s._currentRoom;
    };
    t.drawActorCostume = function(hitTestMode) {
      var bcr = s.costumeRenderer;
      if(t.costume == 0) return;
      if(!hitTestMode) {
        // TODO Don't draw actor for every frame
        // if(!t.needRedraw) return;
        t.needRedraw = false;
      }
      t.setupActorScale();
      t.prepareDrawActorCostume(bcr);
      if(bcr.drawCostume(s._virtscreens[0], s._gdi.numStrips, t, t.drawToBackBuf) & 1) {
        t.needRedraw = true;
      }
      if(!hitTestMode) {
        t.top = bcr.draw_top;
        t.bottom = bcr.draw_bottom;
      }
    };
    t.setupActorScale = function() {
      if(t.ignoreBoxes) return;
    };
    t.prepareDrawActorCostume = function(bcr) {
      bcr.actorId = t.number;
      bcr.actorX = t.pos.x - s._virtscreens[0].xstart;
      bcr.actorY = t.pos.y - t.elevation;
      bcr.scaleX = t.scalex;
      bcr.scaleY = t.scaley;
      bcr.shadow_mode = t.shadow_mode;
      bcr.setCostume(t.costume);
      bcr.setPalette(t.palette);
      bcr.setFacing(t);

      // log("drawing costume "+t.costume+" for actor "+t.number+" at "+t.pos.x+"/"+t.pos.y);

      if(t.forceClip)
        bcr.zbuf = t.forceClip;
      else if(true) { //false) {
        bcr.zbuf = 1;
        // NeverClip
      } else {
        log("mask from box");
        // Mask from Box
      }

      bcr.draw_top = 0x7fffffff;
      bcr.draw_bottom = 0;
    };
    t.animateCostume = function() {
      if(t.costume == 0) return;
      t.animProgress++;
      if(t.animProgress >= t.animSpeed) {
        t.animProgress = 0;
        s.costumeLoader.loadCostume(t.costume);
        if(s.costumeLoader.increaseAnims(t)) {
          t.needRedraw = true;
        }
      }
    };
    t.animateActor = function(anim) {
      var cmd, dir;
      cmd = Math.floor(anim / 4);
      dir = _system.oldDirToNewDir(anim % 4);
      cmd = 0x3F - cmd + 2;
      switch(cmd) {
        case 2: // stop walking
          t.startAnimActor(t.standFrame);
          t.stopActorMoving();
          log("stop walking");
        break;
        case 3: // change direction immediatly
          t.moving &= ~MF_TURN;
          t.setDirection(dir);
        break;
        case 4:
          log("turn to direction");
          t.turnToDirection(dir);
        break;
        default:
          t.startAnimActor(anim);
      }
    };
    t.startAnimActor = function(f) {
      switch(f) {
        case 0x38:
          f = t.initFrame;
        break;
        case 0x39:
          f = t.walkFrame;
        break;
        case 0x3A:
          f = t.standFrame;
        break;
        case 0x3B:
          f = t.talkStartFrame;
        break;
        case 0x3C:
          f = t.talkStopFrame;
        break;
      };
      if(t.isInCurrentRoom() && t.costume != 0) {
        t.animProgress = 0;
        t.needRedraw = true;
        t.cost.animCounter = 0;
        if(f == t.initFrame) {
          t.cost.reset();
        }
        s.costumeLoader.costumeDecodeData(this, f, 0xFFFF);
        t.frame = f;
      }
    };
    t.runActorTalkScript = function(f) {
      var script = t.talkScript, args;
      if(!s.getTalkingActor() || t.room != s._currentRoom || t.frame == f) return;

      if(script) {
        for(vari = 0; i < 16; i++) {
          args[i] = 0;
        }
        args = [f, t.number];
        log("running talk script "+script);
        s.runScript(script, 1, 0, args);
      }

    };
    t.stopActorMoving = function() {
      t.moving = 0;
    };
    t.setActorWalkSpeed = function(newSpeedX, newSpeedY) {
      if(newSpeedX == t.speedx && newSpeedY == t.speedy) return;

      t.speedx = newSpeedX;
      t.speedy = newSpeedY;

      if(t.moving) {
        t.calcMovementFactor(t.walkdata.next);
      }
    };
    t.calcMovementFactor = function(next) {
      var diffX, diffY, deltaXFactor, deltaYFactor;

      if(t.pos.x == next.x && t.pos.y == next.y) return 0;

      t.walkdata.cur = t.pos;
      t.walkdata.next = next;

      if(t.targetFacing != t.facing) t.facing = t.targetFacing;

      t.actorWalkStep();
    };
    t.actorWalkStep = function() {
      var tmpX, tmpY, distX, distY, nextFacing;
      t.needRedraw = true;

      distX = Math.abs(t.walkdata.dest.x - t.pos.x);
      distY = Math.abs(t.walkdata.dest.y - t.pos.y);

      // log("walk to "+t.walkdata.dest.x+"/"+t.walkdata.dest.y);

      // log("before step "+t.pos.x+"/"+t.pos.y+" dist "+distX+"/"+distY);

      if(distX < t.speedx) t.pos.x = t.walkdata.dest.x;
      else if(t.pos.x > t.walkdata.dest.x) t.pos.x -= t.speedx;
      else if(t.pos.x < t.walkdata.dest.x) t.pos.x += t.speedx;

      if(distY < t.speedy) t.pos.y = t.walkdata.dest.y;
      else if(t.pos.y > t.walkdata.dest.y) t.pos.y -= t.speedy;
      else if(t.pos.y < t.walkdata.dest.y) t.pos.y += t.speedy;

      // log("after step "+t.pos.x+"/"+t.pos.y);

      if(t.pos.x == t.walkdata.dest.x && t.pos.y == t.walkdata.dest.y) {
        t.moving = false;
      }
    };
    t.startWalkActor = function(destX, destY, dir) {
      var abr = t.adjustXYToBeInBox(destX, destY);

      if(!t.isInCurrentRoom()) {
        t.pos.x = abr.x;
        t.pos.y = abr.y;
        if(!t.ignoreTurns && dir != -1)
          t._facing = dir;
        return;
      }

      if(t.ignoreBoxes) {
        abr.box = "invalid";
        t.walkbox = "invalid";
      } else {
      }

      t.walkdata.dest.x = abr.x;
      t.walkdata.dest.y = abr.y;
      t.walkdata.destbox = abr.box;
      t.walkdata.destdir = dir;
      t.moving = true;
      t.walkdata.curbox = t.walkbox;

      log("start walk "+destX+"/"+destY);
    };
    t.walkActor = function() {
      if(!t.moving) return;
      t.actorWalkStep();
    };
    t.setActorCostume = function(c) {
      var i;
      t.costumeNeedsInit = true;
      if(t.visible) {
        t.hideActor();
        t.cost.reset();
        t.costume = c;
        t.showActor();
      } else {
        t.costume = c;
        t.cost.reset();
      }

      for(i = 0; i < 32; i++) {
        t.palette[i] = 0xFF;
      }
    };
    t.setPalette = function(idx, val) {
      t.palette[idx] = val;
      t.needRedraw = true;
    };
    t.setScale = function(sx, sy) {
      if(sx != -1)
        t.scalex = sx;
      if(sy != -1)
        t.scaley = sy;
      t.needRedraw = true;
    };
    t.setDirection = function(dir) {
      var amask, i, vald;
      if(t.facing == dir) return;
      t.facing = _system.normalizeAngle(dir);
      if(t.costume == 0) return;

      amask = 0x8000;
      for(i = 0; i < 16; i++, amask >>= 1) {
        vald = t.cost.frame[i];
        if(vald == 0xFFFF) continue;
        s.costumeLoader.costumeDecodeData(this, vald, amask);
      }
      t.needRedraw = true;
    };
    t.faceToObject = function(obj) {
      var x2, y2, dir;

      if(!t.isInCurrentRoom()) return;
      dir = 90;
      t.turnToDirection(dir);
    };
    t.turnToDirection = function(newdir) {
      if(newdir == -1 || t.ignoreTurns) return;

      // t.moving = MF_TURN;
      // t.targetFacing = newdir;
    };

    t.showActor = function() {
      if(s._currentRoom == 0 || t.visible) return;
      t.adjustActorPos();
      s.ensureResourceLoaded("costume", t.costume);
      if(t.costumeNeedsInit) {
        t.startAnimActor(t.initFrame);
        t.costumeNeedsInit = false;
      }
      t.visible = true;
      t.needRedraw = true;
    };
    t.hideActor = function() {
      if(!t.visible) return;
      if(t.moving) {
      }
      t.visible = false;
      t.needRedraw = false;
      t.needBgReset = true;
    };
    t.adjustXYToBeInBox = function(dstX, dstY) {
      var abr = {x: 0, y: 0, box: "invalid"};

      abr.x = dstX;
      abr.y = dstY;

      return abr;
    }

    t.initActor(-1);
  };

  s.CostumeLoader = function() {
    var t = this;
    t.baseptr = null;
    t.animCmds = [];
    t.dataOffsets = 0;
    t.palette = [];
    t.frameOffsets = 0;
    t.numColors = 0;
    t.numAnim = 0;
    t.format = 0;
    t.mirror = true;
    t.id = 0;

    t.loadCostume = function(id) {
      var ptr, i, tmp;

      t.id = id;
      ptr = s.getResourceAddress("costume", id).newRelativeStream();
      ptr.seek(2);
      t.baseptr = ptr.newRelativeStream();
      t.numAnim = ptr.seek(6).readUI8();
      tmp = ptr.readUI8();
      t.format = tmp & 0x7F;
      t.mirror = (tmp & 0x80) != 0;
      switch(t.format) {
        case 0x58:
          t.numColors = 16;
        break;
        case 0x59:
          t.numColors = 32;
        break;
        default:
          log("costume "+id+" with format 0x"+t.format.toString(16)+" is invalid");
      }

      for(i = 0; i < t.numColors; i++)
        t.palette[i] = ptr.readUI8();

      t.frameOffsets = ptr.offset;
      t.dataOffsets = ptr.offset + 32;
      t.animsOffsets = ptr.readUI16();
      t.animCmds = t.baseptr.newRelativeStream(t.animsOffsets);


      var frameOffs = t.baseptr.newRelativeStream(t.frameOffsets);
      for(i = 0; i < 16; i++) {
        var frame = t.baseptr.newRelativeStream(frameOffs.readUI16());
      }
      var animOffs = t.baseptr.newRelativeStream(t.animsOffsets);
      for(i = 0; i < t.numAnim+1; i++) {
        var offs = animOffs.readUI16();
      }
    };
    t.costumeDecodeData = function(actor, frame, usemask) {
      var baseptr, offset, anim, i = 0, j, r, tmp, mask, extra, cmd;

      t.loadCostume(actor.costume);
      anim = _system.newDirToOldDir(actor.facing) + frame * 4;

      if(anim > t.numAnim) {
        return;
      }

      baseptr = t.baseptr.newRelativeStream();
      tmp = baseptr.newRelativeStream(t.dataOffsets + anim * 2);
      offset = tmp.readUI16();
      if(offset == 0) return;
      r = baseptr.newRelativeStream(offset);

      mask = r.readUI16();
      do {
        if(mask & 0x8000) {
          j = r.readUI16();
          if(usemask & 0x8000) {
            if(j == 0xFFFF) {
              actor.cost.curpos[i] = 0xFFFF;
              actor.cost.start[i] = 0;
              actor.cost.frame[i] = frame;
            } else {
              extra = r.readUI8();
              cmd = t.animCmd(j);
              if(cmd == 0x7A) {
                actor.cost.stopped &= ~(1 << i);
              } else if(cmd == 0x79) {
                actor.cost.stopped |= (1 << i);
              } else {
                actor.cost.curpos[i] = actor.cost.start[i] = j;
                actor.cost.end[i] = j + (extra & 0x7F);
                if(extra & 0x80)
                  actor.cost.curpos[i] |= 0x8000;
                actor.cost.frame[i] = frame;
              }
            }
          } else {
            if(j != 0xFFFF)
              r.readUI8();
          }
        }
        i++;
        usemask <<= 1;
        mask <<= 1;
      } while (mask & 0xFFFF);
    };
    t.increaseAnims = function(a) {
      var i, r = 0;
      for(i = 0; i != 16; i++) {
        if(a.cost.curpos[i] != 0xFFFF)
          r += t.increaseAnim(a, i);
      }
      return r;
    };
    t.animCmd = function(i) {
      return t.animCmds.newRelativeStream(i).readUI8();
    }
    t.increaseAnim = function(a, slot) {
      var highflag, i, end, code, nc, cost = a.cost, curpos = cost.curpos[slot];

      if(curpos == 0xFFFF)
        return 0;
      highflag = curpos & 0x8000;
      i = curpos & 0x7FFF;
      end = cost.end[slot];
      code = t.animCmd(i) & 0x7F;

      do {
        if(!highflag) {
          if(i++ >= end)
            i = cost.start[slot];
        } else {
          if(i != end)
            i++;
        }
        nc = t.animCmd(i);
        if(nc == 0x7C) {
          cost.animCounter++;
          if(cost.start[slot] != end)
            continue;
        } else {
          if(nc == 0x78) {
            if(cost.start[slot] != end)
              continue;
          }
        }
        cost.curpos[slot] = i | highflag;
        return (t.animCmd(i) & 0x7F) != code;
      } while(1);
    };
    t.hasManyDirections = function(id) {
      return false;
    };
  };

  s.CostumeRenderer = function() {
    var t = this;
    t.loader = s.costumeLoader;
    t.actorX = t.actorY = 0;
    t.zbuf = 0;
    t.scaleX = t.scaleY = 0;
    t.scaleIndexX = t.scaleIndexY = 0;
    t.draw_top = t.draw_bottom = 0;
    t.out = t.srcptr = null;
    t.palette = [];
    t.mirror = false;

    t.setPalette = function(palette) {
      var i, color;
      for(i = 0; i < t.loader.numColors; i++)
        t.palette[i] = t.loader.palette[i];
    };
    t.setFacing = function(actor) {
      t.mirror = _system.newDirToOldDir(actor.facing) != 0 || t.loader.mirror;
    };
    t.setCostume = function(costume, shadow) {
      t.loader.loadCostume(costume);
    };
    t.drawCostume = function(vs, numStrips, a, drawToBackBuf) {
      var i, result = 0
      t.out = _system.clone(vs);
      var dst = t.out;
      if(drawToBackBuf)
        dst.pixels = vs.getBackPixels(0, 0);
      else
        dst.pixels = vs.getPixels(0, 0);

      t.actorX += s._virtscreens[0].xstart & 7;
      dst.w = dst.pitch;
      dst.pixels.seek(-(s._virtscreens[0].xstart & 7));
      t.numStrips = numStrips;
      t.xmove = t.ymove = 0;
      for(i = 0; i < 8; i++)
        result |= t.drawLimb(a, i);
      return result;
    };
    t.drawLimb = function(actor, limb) {
      var i, code, baseptr, frameptr, frameoffset, cost = actor.cost, costumeInfo, xmoveCur, ymoveCur, offset;

      if(cost.curpos[limb] == 0xFFFF || cost.stopped & (1 << limb))
        return 0;

      i = cost.curpos[limb] & 0x7FFF;
      baseptr = t.loader.baseptr.newRelativeStream();
      offset = t.loader.frameOffsets + limb * 2;
      frameoffset = baseptr.newRelativeStream(offset).readUI16();
      frameptr = baseptr.newRelativeStream(frameoffset);
      code = t.loader.animCmd(i) & 0x7F;
      if(code != 0x7B) {
        frameptr.seek(code * 2);
        offset = frameptr.readUI16();
        if(offset > baseptr.length) return 0;
        t.srcptr = baseptr.newRelativeStream(offset);
        costumeInfo = new s.CostumeInfo(t.srcptr);
        t.width = costumeInfo.width;
        t.height = costumeInfo.height;
        xmoveCur = t.xmove + costumeInfo.rel_x;
        ymoveCur = t.ymove + costumeInfo.rel_y;
        t.xmove += costumeInfo.move_x;
        t.ymove -= costumeInfo.move_y;

        return t.mainRoutine(xmoveCur, ymoveCur);
      }
      return 0;
    };

    t.mainRoutine = function(xmoveCur, ymoveCur) {
      var i, skip = 0, drawFlag = 1, use_scaling, startScaleIndexX, ex1, ex2, rect = {left: 0, right: 0, top: 0, bottom: 0}, step;
      var codec = {
        x: 0, y: 0, skip_width: 0, destptr: null, mask_ptr: null, scaleXstep: 0, mask: 0, shr: 0, repcolor: 0, replen: 0
      };
      if(t.loader.numColors == 32) {
        codec.mask = 7; codec.shr = 3;
      } else {
        codec.mask = 15; codec.shr = 4;
      }
      use_scaling = (t.scaleX != 0xFF) || (t.scaleY != 0xFF);
      codec.x = t.actorX;
      codec.y = t.actorY;

      if(use_scaling) {
        codec.scaleXstep = -1;
        if(xmoveCur < 0) {
          xmoveCur = -xmoveCur;
          codec.scaleXstep = 1;
        }
        if(t.mirror) {
          startScaleIndexX = t.scaleIndexX = scaletableSize - xmoveCur;
          for(i = 0; i < xmoveCur; i++) {
            if(scale_table[t.scaleIndexX++] < t.scaleX)
              codec.x -= codec.scaleXstep;
          }

          rect.left = rect.right = codec.x;

          t.scaleIndexX = startScaleIndexX;
          for(i = 0; i < t.width; i++) {
            if(rect.right < 0) {
              skip++;
              startScaleIndexX = t.scaleIndexX;
            }
            if(scale_table[t.scaleIndexX++] < t.scaleX)
              rect.right++;
          }
        } else {
          startScaleIndexX = t.scaleIndexX = xmoveCur + scaletableSize;
          for(i = 0; i < xmoveCur; i++) {
            if(scale_table[t.scaleIndexX--] < t.scaleX)
              codec.x += codec.scaleXstep;
          }

          rect.left = rect.right = codec.x;

          t.scaleIndexX = startScaleIndexX;
          for(i = 0; i < t.width; i++) {
            if(rect.left >= t.out.w) {
              startScaleIndexX = t.scaleIndexX;
              skip++;
            }
            if(scale_table[t.scaleIndexX--] < t.scaleX)
              rect.left--;
          }
        }

        t.scaleIndexX = startScaleIndexX;

        if(skip) skip--;

        step = -1;
        if(ymoveCur < 0) {
          ymoveCur = -ymoveCur;
          step = 1;
        }

        t.scaleIndexY = scaletableSize - ymoveCur;
        for(i = 0; i < ymoveCur; i++) {
          if(scale_table[t.scaleIndexY++] < t.scaleY)
            codec.y -= step;
        }

        rect.top = rect.bottom = codec.y;
        t.scaleIndexY = scaletableSize - ymoveCur;
        for(i = 0; i < t.height; i++) {
          if(scale_table[t.scaleIndexY++] < t.scaleY)
            rect.bottom++;
        }

        t.scaleIndexY = scaletableSize - ymoveCur;
      } else {
        if(!t.mirror)
          xmoveCur = -xmoveCur;
        codec.x += xmoveCur
        codec.y += ymoveCur

        if(t.mirror) {
          rect.left = codec.x;
          rect.right = codec.x + t.width;
        } else {
          rect.left = codec.x - t.width;
          rect.right = codec.x;
        }

        rect.top = codec.y;
        rect.bottom = rect.top + t.height;
      }

      codec.skip_width = t.width;
      codec.scaleXstep = t.mirror ? 1 : -1;

      // mark dirty

      if(rect.top >= t.out.h || rect.bottom <= 0) {
        return 0;
      }
      if(rect.left >= t.out.w || rect.right <= 0) {
        return 0;
      }

      codec.replen = 0;
      if(t.mirror) {
        if(!use_scaling)
          skip = -codec.x;
        if(skip > 0) {
          codec.skip_width -= skip;
          t.codec_ignorePakCols(codec, skip);
          codec.x = 0;
        } else {
          skip = rect.right - t.out.w;
          if(skip <= 0) {
            drawFlag = 2;
          } else {
            codec.skip_width -= skip;
          }
        }
      } else {
        if(!use_scaling)
          skip = rect.right - t.out.w;
        if(skip > 0) {
          codec.skip_width -= skip;
          t.codec_ignorePakCols(codec, skip);
          codec.x = 0;
        } else {
          skip = -1 - rect.left;
          if(skip <= 0)
            drawFlag = 2;
          else
            codec.skip_width -= skip;
        }
      }

      if(codec.skip_width <= 0) {
        return 0;
      }

      if(rect.left < 0)
        rect.left = 0;
      if(rect.top < 0)
        rect.top = 0;
      if(rect.top > t.out.h)
        rect.top = t.out.h;
      if(rect.bottom > t.out.h)
        rect.bottom = t.out.h;

      if(t.draw_top > rect.top)
        t.draw_top = rect.top;
      if(t.draw_bottom < rect.bottom)
        t.draw_bottom = rect.bottom;

      if(t.height + rect.top > 256) {
        return 2;
      }

      codec.destptr = t.out.pixels.newRelativeStream(codec.y * t.out.pitch + codec.x);

      codec.mask_ptr = s._gdi.getMaskBuffer(0, codec.y, t.zbuf);

      t.proc3(codec);

      return drawFlag;
    };

    t.codec_ignorePakCols = function(codec, num) {
      // log("ignore "+num+" cols for actor "+t.actorId);
      num *= t.height;
      do {
        codec.replen = t.srcptr.readUI8();
        codec.repcolor = codec.replen >> codec.shr;
        codec.replen &= codec.mask;
        if(!codec.replen)
          codec.replen = t.srcptr.readUI8();
        do {
          if(!--num) return;
        } while(--codec.replen);
      } while(1);
    };

    t.proc3 = function(codec) {
      var mask, src, dst, len, maskbit, maskval, y, color, height, pcolor, scaleIndexY, masked = false, startpos = false;

      y = codec.y;
      src = t.srcptr.newRelativeStream();
      dst = codec.destptr.newRelativeStream();
      len = codec.replen;
      color = codec.repcolor;
      height = t.height;

      scaleIndexY = t.scaleIndexY;
      maskbit = revBitMask(codec.x & 7);
      mask = codec.mask_ptr.newRelativeStream(Math.floor(codec.x / 8));

      if(len > 0)
        startpos = true;

      do {
        if(!startpos) {
          len = src.readUI8();
          color = len >> codec.shr;
          len &= codec.mask;
          if(!len)
            len = src.readUI8();
        }

        do {
          if(!startpos) {
            if(t.scaleY == 255 || scale_table[scaleIndexY++] < t.scaleY) {
              maskval = mask.readUI8();
              mask.seek(-1);
              masked = (y < 0 || y >= t.out.h) || (codec.x < 0 || codec.x >= t.out.w) || (codec.mask_ptr && (maskval & maskbit));
              if(codec.mask_ptr && (maskval & maskbit))
                ; //log("masked in mask");
              if(color && !masked) {
                pcolor = t.palette[color];
                dst.writeUI8(pcolor);
                dst.seek(-1);
              }
              dst.seek(t.out.pitch);
              mask.seek(t.numStrips);
              y++;
            }
            if(!--height) {
              if(!--codec.skip_width)
                return;
              height = t.height;
              y = codec.y;
              scaleIndexY = t.scaleIndexY;
              if(t.scaleX == 255 || scale_table[t.scaleIndexX] < t.scaleX) {
                codec.x += codec.scaleXstep;
                if(codec.x < 0 || codec.x >= t.out.w)
                  return;
                maskbit = revBitMask(codec.x & 7);
                codec.destptr.seek(codec.scaleXstep);
              }
              t.scaleIndexX += codec.scaleXstep;
              dst = codec.destptr.newRelativeStream();
              mask = codec.mask_ptr.newRelativeStream(Math.floor(codec.x / 8));
            }
          }
          startpos = false;
        } while(--len);
      } while(1);

    };

  };

  s.isValidActor = function(id) {
    var t = this;
    return id >= 0 && id < t._actors.length && t._actors[id] && t._actors[id].number == id;
  };

  s.getActor = function(id) {
    var t = this;
    if(id == 0) return null;
    if(!t.isValidActor(id)) {
      return null;
    }
    return t._actors[id];
  };

  s.processActors = function() {
    var t = this, i, j, numactors = 0, tmp, actor;
    for(i = 1; i < t._nums['actors']; i++) {
      if(t._actors[i] && t._actors[i].isInCurrentRoom()) {
        t._sortedActors[numactors++] = t._actors[i];
      }
    }
    if(!numactors) return;

    // Sort actors
    for(j = 0; j < numactors; ++j) {
      for(i = 0; i < numactors; ++i) {
        var sc_actor1 = t._sortedActors[i].pos.y - t._sortedActors[j].layer * 200;
        var sc_actor2 = t._sortedActors[j].pos.y - t._sortedActors[i].layer * 200;
        if(sc_actor1 < sc_actor2) {
          tmp = t._sortedActors[i];
          t._sortedActors[i] = t._sortedActors[j];
          t._sortedActors[i] = tmp;
        }
      }
    }

    // Draw actors
    // var actors = "";
    for(i = 0; i < numactors; ++i) {
      actor = t._sortedActors[i];
      // actors += actor.number;
      // actors += " ";
      if(actor.costume) {
        actor.drawActorCostume();
        actor.animateCostume();
      }
    }
    // window.console.log(actors);
  };

  s.showActors = function() {
    var t = this, i;
    for(i = 1; i < t._actors.length; i++) {
      if(t._actors[i].isInCurrentRoom())
        t._actors[i].showActor();
    }
  };

  s.walkActors = function() {
    var t = this, i;
    for(i = 1; i < t._actors.length; i++) {
      if(t._actors[i].isInCurrentRoom())
        t._actors[i].walkActor();
    }
  };

  s.resetActorBgs = function() {
    var t = this, i, j, strip;
    for(i = 0; i < t._gdi.numStrips; i++) {
      strip = t.screenStartStrip + i;
      for(j = 1; j < t._actors.length; j++) {
        if((t._actors[j].top != 0x7fffffff && t._actors[j].needRedraw )|| t._actors[j].needBgReset) {
          if((t._actors[j].bottom - t._actors[j].top) >= 0) {
            t._gdi.resetBackground(t._actors[j].top, t._actors[j].bottom, i);
          }
        }
      }
    }
    for(j = 1; j < t._actors.length; j++) {
      t._actors[j].needBgReset = false;
    }
  }

  s.getTalkingActor = function() {
    return s.scummVar("talk_actor");
  }

  s.setTalkingActor = function(i) {
    var x, y, text = s._string[0];

    if(i == 255) {
      text.x = 0;
      text.y = 0;
      text.text = "";
      // log("text at "+text.x+"/"+text.y);
      // clearFocusRectangle
    } else if(i > 0) {
      text.x = s._actors[i].pos.x - (s._camera.cur.x - (s._screenWidth / 2));
      text.y = s._actors[i].top - (s._camera.cur.y - (s._screenHeight / 2)) - 128;
      if(text.y <= 15) text.y = 15;
      log("text at "+text.x+"/"+text.y);
      // setFocusRectangle
    }
    s.scummVar("talk_actor", i);
  };

  s.actorTalk = function(msg) {
    var oldact, a;
    if(s._actorToPrintStrFor == 0xFF) {
      if(!s._keepText) {
        s.stopTalk();
      }
      s.setTalkingActor(0xFF);
    } else {
      a = s.getActor(s._actorToPrintStrFor);
      if(!a.isInCurrentRoom()) {
        oldact = 0xFF;
      } else {
        if(!s._keepText) {
          s.stopTalk();
        }
        s.setTalkingActor(a.number);
        if(!s._string[0].no_talk_anim) {
          a.runActorTalkScript(a.talkStartFrame);
          s._useTalkAnims = true;
        }
        oldact = s.getTalkingActor();
      }
      if(oldact >= 0x80)
        return;
    }

    a = s.getActor(s.getTalkingActor());
    if(!a) return;
    var text = s._string[0];
    text.color = a.talkColor;
    text.text = msg;
    s._talkDelay = 0;
    s._haveMsg = 0xFF;
    s.scummVar("have_msg", 0xFF);
    if(s.scummVar("charcount") != 0xFF)
      s.scummVar("charcount", 0);
    s._haveActorSpeechMsg = true;
    window.setTimeout(function() {
      s.stopTalk();
    }, 5 * 1000);
  };


  s.stopTalk = function() {
    var act, a;
    s._haveMsg = 0;
    s._talkDelay = 0;
    a = s.getTalkingActor();
    if(a && a < 0x80) {
      act = s.getActor(a);
      if(act.isInCurrentRoom() || s._useTalkAnims) {
        act.runActorTalkScript(a.talkStopFrame);
        s._useTalkAnims = false;
      }
      s.setTalkingActor(0xFF);
    }
    s._keepText = false;
  };

  s.costumeLoader = new s.CostumeLoader();
  s.costumeRenderer = new s.CostumeRenderer();

}());

 // E N D      src="src/engines/costume.js"

 
// S P L U N K rnd00437_dot_333333
 // E N D  of original work by https://github.com/Emupedia (emulator jsscummvm)

 // B E G I N  custom "myscript_jsscumm_alt_loader.js"

 self._alt_part_loader=function LoadMoreLikeTheRightWay(){
   //need to add my modifications, or just switch it from the original to THIS github repo (this fork)
  let /*_js_need_loaded_*/ a=[
"src/jsscumm.js",
"src/system.js",
"src/stream.js",
"src/engines/scumm.js",
"src/engines/resources.js",
"src/engines/script.js",
"src/engines/room.js",
"src/engines/gfx.js",
"src/engines/palette.js",
"src/engines/camera.js",
"src/engines/costume.js"
],
i=0,L=a.length, xh= new XMLHttpRequest(), d=document,
basePATH="https://raw.githubusercontent.com/mutle/jsscummvm/refs/heads/master/";
(xh.onreadystatechange=function(e,o1){let rs=xh.readyState==4; if(o1||(rs&&i<L)){
  if(rs){
    let cs=d.createElement("script"); cs.type="text/javascript";
    cs.innerHTML=xh.response;
    d.body.appendChild(cs);
    i++;
  }
  xh.open("GET",basePATH+a[i]); xh.send();
} } )(0,1);

 }; // E N D   of   _alt_part_loader=function LoadMoreLikeTheRightWay
