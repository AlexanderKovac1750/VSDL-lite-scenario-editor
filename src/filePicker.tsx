import './globals'
import { stringifyScenario, setFile, getFile, setFileHandle, getFileHandle } from './globals';

export function openFilePicker({ 
  accept  = "*/*",       // file types (e.g. "image/*" or ".pdf,.docx")
} = {}) {
  return new Promise((resolve, reject) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = false;
      input.style.display = "none";

      input.onchange = async() => {
        if (input.files && input.files.length > 0) {

            const chosen_file : File|null = input.files.item(0);

            if(chosen_file === null){
                resolve(null);
            }
            else{
                const data = await chosen_file.arrayBuffer();
                const file = new File([data], chosen_file.name, {
                    type: chosen_file.type,
                    lastModified: Date.now()
                });
                console.log(`opened ${file.name}`);

                setFile(file);//set global file variable
                setFileHandle(null);//reset file handle
                
                resolve(file);
            }
        } else {
          resolve(null);
        }
      };

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    } catch (error) {
      reject(error);
    }
  });
}

export function downloadFile(contents:string|Blob, name:string){
    const blob = (typeof(contents) == "string") ? new Blob([contents], { type: "text/plain" }) : contents;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function pickFileToRead({ 
  accept  = "*/*",       // file types (e.g. "image/*" or ".pdf,.docx")
} = {}):Promise<File|null> {
  return new Promise((resolve, reject) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = false;
      input.style.display = "none";

      input.onchange = async() => {
        if (input.files && input.files.length > 0) {

            const chosen_file : File|null = input.files.item(0);

            if(chosen_file === null){
                resolve(null);
            }
            else{
                const data = await chosen_file.arrayBuffer();
                const file = new File([data], chosen_file.name, {
                    type: chosen_file.type,
                    lastModified: Date.now()
                });
                console.log(`opened ${file.name}`);
                
                resolve(file);
            }
        } else {
          resolve(null);
        }
      };

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    } catch (error) {
      reject(error);
    }
  });
}

export async function saveFile(handle : FileSystemFileHandle|null) {
    const file : File|null = getFile();
    if(file === null){
        console.warn("trying to save non-existant file");
    }

    const contents : string = stringifyScenario();
    
    const suggestedName : string = (file === null) ? "input.vsdl" : file.name;

    if(handle===null){
        console.log("picking save location");
        try{
            // ask user where to save
            if ("showSaveFilePicker" in window) {
                handle = await (window as unknown as {
                    showSaveFilePicker: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
                }).showSaveFilePicker({
                    suggestedName: suggestedName,
                });
                setFileHandle(handle);
            }
        } catch (err: any) {
            console.warn("Direct save failed, falling back to download", err);
            if(err.name === "AbortError"){
                return;//saving aborted by user
            }
        }
    }

    if(handle!==null){//write to chosen location
        const writable = await handle.createWritable();
        await writable.write(contents);
        await writable.close();
        return;
    }

    // ✅ Fallback: force download in all browsers
    downloadFile(contents,suggestedName);
}

export function makeNewFile(){
    const file = new File(["Hello world!"], "input.vsdl", { type: "text/plain" });
    setFile(file);
    setFileHandle(null);
}



export default openFilePicker;