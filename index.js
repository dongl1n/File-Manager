
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'url';

/* ----------------------------------------------- GLOBAL ----------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
let currentDir;


class Manager{
  start(){
    currentDir = path.dirname(__filename);
    this.print();
  }
  print(){
    console.log(`You are currently in ${currentDir.toLowerCase()}`);
  }
}

class Directory extends Manager{
  home(){
    currentDir = homedir();
    this.print();
  }
  
  up(){
    currentDir = path.join(currentDir, '../');
    this.print();
  }

  cd(newPath){
    newPath = newPath.trim().toLowerCase();
    const regex = /\\/i;
    let cur = currentDir.toLowerCase();
    while(cur.includes("\\")) cur = cur.replace(regex, "/");
    
    if(!path.isAbsolute(newPath)){
      currentDir = path.join(cur, newPath);
      this.print();
      return;
    }
    if(newPath.includes(cur.toString())){
      newPath = newPath.replace(cur, '');
      if(fs.existsSync(cur+"/"+newPath)) currentDir = path.join(cur, newPath);
      else console.log("Error: Invalid input");
    }
    else{
      if(fs.existsSync(newPath)) currentDir = path.join(newPath);
      else console.log("Error: Invalid input");
    }

    this.print();

  }

  ls(){
    const structDataDir = [], structDataFile = [];
    let counter, counterErr=0, flag=0;
    fs.readdir(currentDir, (err, files) => {
      if(err) throw err;
      if(!files.length) console.log("FS operation failed: files do not exist");
      for (let file of files){
        fs.stat(currentDir+"/"+file, (err, stats) => {
          if (err) {
            counterErr++;
            return;
          }
          if(stats.isDirectory()){
            let obj = {};
            obj.name = file;
            obj.type = 'directory';
            structDataDir.push(obj);
            structDataDir.sort();
            counter++;
          }
        });
      }

      for (let file of files){
        fs.stat(currentDir+"/"+file, (err, stats) => {
          if (err) {
            counterErr++;
            console.error(err);
            return;
          }
          if(stats.isFile()){
            let obj = {};
            obj.name = file;
            obj.type = 'file';
            structDataFile.push(obj);
            structDataFile.sort();
          }
          counter = files.length;
        });
      }
    })
    let interval = setInterval(()=>{
      
      if(structDataFile.length+structDataDir.length === counter-(counterErr/2)) flag = 1; 
      if(flag){
        console.table([...structDataDir, ...structDataFile]);
        this.print();
        clearInterval(interval);
      }

    }, 100)
  }
}

class File extends Manager{
  add(pathFile){
    pathFile = pathFile.trim();
    if (fs.existsSync(currentDir+"/"+pathFile)){
      throw 'FS operation failed: The file folder has already been created';
    }
    else{
        fs.writeFile(currentDir+"/"+pathFile, "", function(error){
            if(error) throw error;
            else error;
        });
    }
    this.print();
  }

  hash(pathFile){
    const hash = createHash('sha256');
    const input = createReadStream(pathFile.toLowerCase());
    input.on('readable', () => {
      const data = input.read();
      if (data)
          hash.update(data);
      else {
          console.log(`${hash.digest('hex')}`);
      }
    });
    this.print();
  }
}

/* ----------------------------------------------- MAIN ----------------------------------------------- */

const m = new Manager();
const dir = new Directory();
const file = new File();

m.start();

const write = async () => {
  console.log("Press Ctrl+C or write .exit if you want to finish recording")
  process.stdin.on("data", data => {
      data = data.toString();
      switch(data.trim()){
        case ".exit":{
          console.log(`Thank you for using File Manager, ${process.env['npm_config_username']}, goodbye!`)
          process.exit(0);
          return;
        }
        case "home":{
          dir.home();
          break;
        }
        case "up":{
          dir.up();
          return;
        }
        case "ls":{
          dir.ls();
          return;
        }
        default:{
          if(data.startsWith("cd ") && data.length > 5 && data.split(' ').length-1 === 1){
            dir.cd(data.split(' ')[1]);
            break;
          }
          if(data.startsWith("add ") && data.length > 6 && data.split(' ').length-1 === 1){
            let fileName = data.slice(4);
            if(fileName.includes(".")) file.add(fileName);
            else "Error: invalid input";
            break;
          }
        }
        if(data.startsWith("hash ") && data.length > 7){
          let fileName = data.slice(5);
          console.log("ПУТЬ" + fileName)
          file.hash(fileName)
          break;
        }
      }
  })
};

await write();