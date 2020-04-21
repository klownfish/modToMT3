/*********************************
 * By Olof Helgesson
 * 
 * modParser.js 1.0.1 - 2020-4-20
 * 
 * https://github.com/klownfish/modParser.js
 * 
 * licensed under LGPLv3
*****************************************/

let modParser = {}; //global variable that contains the library
modParser.periods = { 0: "rest",
  1712: "c0", 1616: "c#0", 1525: "d0", 1440: "d#0", 1357: "e0", 1281: "f0",
  1209: "f#0", 1141: "g0", 1077: "g#0", 1017: "a0", 961: "a#0", 907: "b0",

  856: "c1", 808: "c#1", 762: "d1", 720: "d#1", 678: "e1", 640: "f1",
  604: "f#1", 570: "g1", 538: "g#1", 508: "a1", 480: "a#1", 453: "b1",

  428: "c2", 404: "c#2", 381: "d2", 360: "d#2", 339: "e2", 320: "f2",
  302: "f#2", 285: "g2", 269: "g#2", 254: "a2", 240: "a#2", 226: "b2",

  214: "c3", 202: "c#3", 190: "d3", 180: "d#3", 170: "e3", 160: "f3",
  151: "f#3", 143: "g3", 135: "g#3", 127: "a3", 120: "a#3", 113: "b3",

  107: "c4", 101: "c#4", 95: "d4", 90: "d#4", 85: "e4", 80: "f4", 
  76: "f#4", 71: "g3", 67: "g#3", 64: "a3", 60: "a#3", 57: "b3"
}
//wrap everything in a scope
{
  //taken from https://www.quaxio.com/%C2%B5_mod_player_from_scratch/
  let MK_to_channels = {
    "2CHN": 2,
    "M.K.": 4,
    "M!K!": 4,
    "4CHN": 4,
    "FLT4": 4,
    "6CHN": 6,
    "8CHN": 8,
    "OKTA": 8,
    "CD81": 8
  }

  function readFileWithPromise(file) {
    return new Promise( (resolve, reject) => {
      let reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      }
      reader.readAsBinaryString(file);
    });
  }

  function getMax(arr) {
    let max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > max) {
        max = arr[i];
      }
    }

    return max;
  }

  function getTrimmedLength(arr) {
    let lastValue = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i]) {
        lastValue = i;
      }
    }

    return lastValue;
  }

  modParser = new class {
    parseString(source) {
      let mod = new Mod();
      let reader = new Reader(source);
      mod.name = reader.read(20).replace(/\u0000/g, '');

      //read M.K. Byte to get channels
      reader.seek(1080);
      let MK = reader.read(4);

      let channelsLength = MK_to_channels[MK] ? MK_to_channels[MK] : 4;
      let samplesLength = MK_to_channels[MK] ? 31 : 15;

      reader.seek(20);

      //read sample data
      for (let i = 0; i < samplesLength; i++) {
        mod.samples[i] = {};
        mod.samples[i].name = reader.read(22).replace(/\u0000/g, '');
        mod.samples[i].sampleLength = (reader.readByteNum() << 8 |
          reader.readByteNum()) * 2;
        mod.samples[i].finetune = reader.readByteNum() & 0x0F;
        mod.samples[i].volume = reader.readByteNum();
        mod.samples[i].repeatStart = (reader.readByteNum() << 8 |
          reader.readByteNum()) * 2;
        mod.samples[i].repeatLength = reader.readByteNum() << 8 |
          reader.readByteNum();
      }

      //number of patterns to be played
      let songLength = reader.readByteNum();

      //useless byte, usually set to 127
      reader.readByteNum();

      //read pattern order
      mod.patternOrder = []
      for (let i = 0; i < 128; i++) {
        if (i < songLength)
          mod.patternOrder[i] = reader.readByteNum();
        else
          reader.readByteNum();
      }

      //skip M.K. byte
      reader.read(4)

      //loop through patterns
      for (let pattern = 0; pattern <= getMax(mod.patternOrder); pattern++) {
        mod.patterns[pattern] = []
        let lastPosition = 0;

        //loop through pattern position
        for (let position = 0; position < 64; position++) {
          mod.patterns[pattern][position] = []

          //loop through channels
          for (let channel = 0; channel < channelsLength; channel++) {
            let byte1 = reader.readByteNum()
            let byte2 = reader.readByteNum()
            let byte3 = reader.readByteNum()
            let byte4 = reader.readByteNum()

            mod.patterns[pattern][position][channel] = {
              periodNum: ((byte1 & 0x0F) << 8) | byte2,
              effect1: byte3 & 0x0F,
              effect2: (byte4 & 0xF0) >> 4,
              effect3: (byte4 & 0x0F),
              sample: (byte1 & 0xF0) | ((byte3 & 0xF0) >> 4)
            };

            let period = modParser.periods[((byte1 & 0x0F) << 8) | byte2];
            mod.patterns[pattern][position][channel].period = period;

            //save last non zero position
            if (mod.patterns[pattern][position][channel].period !== "rest") {
              lastPosition = position + 1;
            }
          }
        }
        //set length to last non zero position
        mod.patterns[pattern].length = lastPosition;
      }//end loop through patterns

      //read sample data
      for (let i = 0; i < samplesLength; i++) {
        mod.samples[i].data = [];
        for (let j = 0; j < mod.samples[i].sampleLength; j++) {
          mod.samples[i].data[j] = reader.readByteNum() - 128;
        }
      }

      return mod;
    }
    
    async parseFile(file) {
      let string = await readFileWithPromise(file);
      return this.parseString(string);
    }
  }

  class Mod {
    constructor() {
      this.name;
      this.samples = [];
      this.patterns = [];
      this.patternOrder = [];
    }
  }

  //class to easily read strings byte by byte.
  class Reader {
    constructor(string) {
      this.index = 0;
      this.string = string;
    }

    read(bytes) {
      let ret = this.string.slice(this.index, this.index + bytes);
      this.index += bytes;
      return ret;
    }

    readByteNum() {
      let ret = this.string.charCodeAt(this.index);
      this.index++;
      return ret;
    }

    seek(bytes) {
      this.index = bytes
    }
  }
}