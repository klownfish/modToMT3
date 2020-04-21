"use strict";
let go = document.getElementById("go");
let log = document.getElementById("log");
let file = document.getElementById("file");

//change the defintion of periods so it fits me better 
//(undefined behavior but i am the author of the library sooooo)
modParser.periods = { 0: "rest",
  1712: "c0", 1616: "cs0", 1525: "d0", 1440: "eb0", 1357: "e0", 1281: "f0",
  1209: "fs0", 1141: "g0", 1077: "ab0", 1017: "a0", 961: "bb0", 907: "b0",

  856: "c1", 808: "cs1", 762: "d1", 720: "eb1", 678: "e1", 640: "f1",
  604: "fs1", 570: "g1", 538: "ab1", 508: "a1", 480: "bb1", 453: "b1",

  428: "c2", 404: "cs2", 381: "d2", 360: "eb2", 339: "e2", 320: "f2",
  302: "fs2", 285: "g2", 269: "ab2", 254: "a2", 240: "bb2", 226: "b2",

  214: "c3", 202: "cs3", 190: "d3", 180: "eb3", 170: "e3", 160: "f3",
  151: "fs3", 143: "g3", 135: "ab3", 127: "a3", 120: "bb3", 113: "b3",

  107: "c4", 101: "cs4", 95: "d4", 90: "eb4", 85: "e4", 80: "f4", 
  76: "fs4", 71: "g3", 67: "ab3", 64: "a3", 60: "bb3", 57: "b3"
}

go.addEventListener("click", clicked)

async function clicked() {
  if (!file.files[0]) {
    log.innerText = "Please input a file.";
    return;
  }
  let mod = await modParser.parseFile(file.files[0]);
  let output = generateAssembly(mod);   

  let name = file.files[0].name.replace(".mod", ".z80");
  download(output, name, 'text/plain');

  log.innerText = "Done!"
}

function generateAssembly(mod) {
  let output = template;
  output += `title:  .db "${mod.name}",0\n`;
  output += `artist: .db "${mod.name}",0\n`;
  output += `album:  .db "${mod.name}",0\n`;
  output += `\n`;
  output += `tempo = 200\n`;
  output += `\n`;
  output += `song: \n`;

  for (let i = 0; i < mod.patternOrder.length; i++) {
    output += `  playsection(pattern${mod.patternOrder[i]})\n`;
  }
  output += `  endsong\n`;
  output += `\n`;

  for (let i = 0; i < mod.patterns.length; i++) {
    output += `pattern${i}:\n`;
    for (let j = 0; j < mod.patterns[i].length; j++) {
      output += `  note(${mod.patterns[i][j][0].period}, `
      for (let k = 1; k < mod.patterns[i][j].length - 1; k++) {
        output += `${mod.patterns[i][j][k].period}, `
      }
      output += `${mod.patterns[i][j][mod.patterns[i][j].length - 1].period}, eighth)\n`
    }
    output += `  endsection\n`
    output += `\n`
  }

  output += `.end\n`
  output += `END`
  return output
}

function download(text, name, type) {
  let a = document.getElementById("fileOutput");
  let file = new Blob([text], {type: type});
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.innerText = "click here to download the converted file";
  a.click()
}