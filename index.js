import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'url';
import { createGzip, createUnzip } from 'node:zlib';
import { pipeline } from 'node:stream';

/* ----------------------------------------------- GLOBAL ----------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
let currentDir;
let command = {
  ".exit":"Go out",
  "home":"Go home directory",
  "up":"Go up a level",
  "cd path_to_directory": "go to directory",
  "ls": "print files and directory in current directory",
  "cat path_to_file": "read and print file in directory",
  "add new_file_name": "add file in directory",
  "rn path_to_file new_filename": "rename file",
  "cp path_to_file path_to_new_directory": "copy file",
  "mv path_to_file path_to_new_directory": "move file to other directory",
  "rm path_to_file": "remove file",
  "os --EOL": "print EOL",
  "os --cpus": "print cpu info",
  "os --homedir": "print home directory",
  "os --username": "print username in os",
  "os --architecture": "print architecture info",
  "hash path_to_file": "print hash for file",
  "compress path_to_file path_to_destination": "compress file",
  "decompress path_to_file path_to_destination": "decompress file",
  "help": "print command list"
};


class Manager{
  start(){
    currentDir = path.dirname(__filename);
    console.log("Command list:")
    this.command()
    this.print();
  }
  print(){
    console.log(`You are currently in ${currentDir.toLowerCase()}`);
    console.log("enter the command")
  }
  command(){
    console.table(command);
  }
  os(param){
    switch(param.trim()){
      case "--EOL":{
        console.log(JSON.stringify(os.EOL));
        break;
      }

      case "--cpus":{
        let objs = os.cpus();
        let counter = 0;
        let result = [];
        console.log("number of CPUs: "+objs.length)
        for(let obj of objs){
          let o = {};
          o.model = obj.model;
          o.speed = obj.speed/1000;
          result[counter] = o;
          counter++;
        }
        console.table(result);
        break;
      }

      case "--homedir":{
        console.log("Home directory: " + os.homedir());
        break;
      }

      case "--username":{
        console.log("User name: "+os.userInfo().username);
        break;
      }

      case "--architecture":{
        console.log("Architecture: " +os.arch());
        break;
      }
      default: {
        console.log("Error: invalid input");
      }

  
    }

    this.print();

  }
}

class Directory extends Manager{
  home(){
    currentDir = os.homedir();
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

  cat(pathFile){
    const input = createReadStream(pathFile.trim(), {encoding: 'utf-8'});
    console.log("Read "+pathFile);
    input.on('readable', () => {
      let data;

      while ((data = input.read()) !== null) {
        console.log(data);
      }
    });
    input.on('end', ()=>{
      console.log("file's end");
      this.print();
    })
  }

  rn(pathsFile){
    let oldFile = pathsFile.split(" ")[0].trim();
    let newFile = pathsFile.split(" ")[1].trim();
    let dir = oldFile.replace(/\w{0,}.\w{0,}$/, "");
    if(!fs.existsSync(oldFile)){
      console.log("The file does not exist");
      return;
    }
    if(fs.existsSync(dir+newFile)){
      console.log("The file does exist");
      return;
    }
    fs.rename(oldFile, dir+newFile, err => {
      if(err) console.log("Operation failed: "+err); // не удалось переименовать файл
      else console.log('Operation completed');
      this.print();
    }); 
  }

  rm(pathFile){
    if (!fs.existsSync(pathFile.trim())){
      console.log("FS operation failed: file do not exist");
      return;
    }
    fs.unlink(pathFile.trim(), err => {
        if(err) console.log("Operation failed: "+err);
        console.log('Operation completed');
        this.print();
    });
  }

  cp(pathsFile){
    let oldFile = pathsFile.split(" ")[0].trim();
    let newFile = pathsFile.split(" ")[1].trim();
    let fileName = oldFile.match(/\w{0,}.\w{0,}$/)[0];
    let data;
    const input = createReadStream(oldFile, {encoding: 'utf-8'});
    console.log(oldFile)
    console.log(newFile+"/"+fileName)
    console.log("Read "+oldFile.trim());
    input.on('readable', () => {

    while ((data = input.read()) !== null) {
        const writer = createWriteStream(newFile+"/"+fileName);
        writer.write(data);
    }
    });
    input.on('end', ()=>{
      console.log("Operation completed");
      this.print();
      return 1;
    })
  }

  mv(pathsFile){
    let oldFile = pathsFile.split(" ")[0].trim();
    let newFile = pathsFile.split(" ")[1].trim();
    let fileName = oldFile.match(/\w{0,}.\w{0,}$/)[0];
    if(!fs.existsSync(oldFile)){
      console.log("The file does not exist");
      return;
    }
    if(fs.existsSync(newFile+"/"+fileName)){
      console.log("The file does exist");
      return;
    }
    this.cp(pathsFile);

    const interval = setInterval(()=>{
      if(fs.existsSync(newFile+"/"+fileName)){
        this.rm(oldFile);
        this.print();
        clearInterval(interval);
      }
    }, 100)
    
  }

  hash(pathFile){
    const hash = createHash('sha256');
    const input = createReadStream(pathFile.trim());
    input.on('readable', () => {
      const data = input.read();
      if (data) hash.update(data);
      else {
          console.log(`hash: ${hash.digest('hex')}`);
          this.print();
      }
    });
  }

  compress(pathsFile){
    let oldFile = pathsFile.split(" ")[0].trim();
    let newFile = pathsFile.split(" ")[1].trim();
    let fileName = oldFile.match(/\w{0,}.\w{0,}$/)[0].replace(/.\w{0,}$/, "");

    console.log(oldFile)
    const gzip = createGzip();
    const source = createReadStream(oldFile);
    const destination = createWriteStream(newFile+"/"+fileName+'.gz');

    pipeline(source, gzip, destination, (err) => {
        if (err) {
            console.error('An error occurred:', err);
            process.exitCode = 1;
        }
    });
  }

  decompress(pathsFile){
    let oldFile = pathsFile.split(" ")[0].trim();
    let newFile = pathsFile.split(" ")[1].trim();
    let fileName = oldFile.match(/\w{0,}.\w{0,}$/)[0].replace(/.\w{0,}$/, "");
    const gzip = createUnzip();
    const destination = createWriteStream(newFile +"/"+ fileName+".txt");
    const source = createReadStream(oldFile);

    pipeline(source, gzip, destination, (err) => {
        if (err) console.log(err);
        process.exitCode = 1;
    });
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
        case "help":{
          m.command()
          break;
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
          else if(data.startsWith("os ") && data.length > 5 && data.split(' ').length-1 === 1){
            m.os(data.split(' ')[1]);
            break;
          }
          else if(data.startsWith("rn ") && data.length > 5){
            let pathsFile = data.slice(3);
            file.rn(pathsFile);
            break;
          }
          else if(data.startsWith("cp ") && data.length > 5){
            let pathsFile = data.slice(3);
            file.cp(pathsFile);
            break;
          }
          else if(data.startsWith("mv ") && data.length > 5){
            let pathsFile = data.slice(3);
            file.mv(pathsFile);
            break;
          }
          else if(data.startsWith("compress ") && data.length > 5){
            let pathsFile = data.slice(9);
            file.compress(pathsFile);
            break;
          }
          else if(data.startsWith("decompress ") && data.length > 5){
            let pathsFile = data.slice(11);
            file.decompress(pathsFile);
            break;
          }
          else if(data.startsWith("rm ") && data.length > 5){
            let pathFile = data.slice(3);
            file.rm(pathFile);
            break;
          }
          else if(data.startsWith("add ") && data.length > 6 && data.split(' ').length-1 === 1){
            let fileName = data.slice(4);
            if(fileName.includes(".")) file.add(fileName);
            else "Error: invalid input";
            break;
          }
          else if(data.startsWith("cat ") && data.length > 6 && data.split(' ').length-1 === 1){
            let fileName = data.slice(4);
            if(fileName.includes(".")) file.cat(fileName);
            else "Error: invalid input";
            break;
          }
          else if(data.startsWith("hash ") && data.length > 7){
            let fileName = data.slice(5);
            file.hash(fileName)
            break;
          }
          else{
            console.log("Error: invalid input");
          }
        }
      }
  })
};

await write();