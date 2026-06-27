
import YAML from 'yaml';
import JSZip from "jszip";

let DefaultBaseBoxes : any;
fetch("/data/base_boxes.yml").then(
    response => response.text().then(
        text => {
            DefaultBaseBoxes = YAML.parse(text);
        }
    )
);

let DefaultEnvLimits : any;
fetch("data/limits.json").then(
    response => response.text().then(
        text => {
            DefaultEnvLimits = JSON.parse(text);
        }
    )
);

export type Network = {
    isNetwork: boolean;
    name: string;
    id: number;
    [key: string]: any;//additional device specific properties
}
export type Device = {
    isNetwork: boolean;
    name: string;
    id: number;
    [key: string]: any;//additional device specific properties
}

export type Firewall_rule = {
    rule: string;
    addressType: string;
    operand1: string;
    operand2: string;
}

let lastID : number = 0;
let networks : Network[]=[];
let devices : Device[]=[];

let selectedEntry: Network|Device|null = null
let delete_target: null|string = null;

//error logging
let error_message: null|string = null;

export function setErrorMessage(message:string){
    error_message=message;
}

export function getErrorMessage():string|null{
    return error_message;
}

export function resetError(){
    error_message=null;
}

//networks
export function newNetwork() : Network{
    let netwoork_name = "network";
    let tmp_num = 0;
    while(networks.some(device => device.name === netwoork_name)){
        tmp_num+=1;
        netwoork_name = "network-"+String(tmp_num);
    }

    let net1 : Network = {name:netwoork_name, isNetwork:true, id:lastID};
    net1.ip="";
    net1.brd="";
    net1.accessible=true;
    net1.connected=[];
    net1.specified=[];
    net1.firewallRules=[];

    lastID=lastID+1;
    networks.push(net1);
    console.log("adding new network");
    return net1;
}
export function getNetworks() : Network[] {
    return networks;
}
export function getNetworkCount() : number{
    return networks.length;
}

export function getNetworkConnected() : Network[] {
    return networks;
}

//devices
export function newDevice() : Device{
    let device_name = "device";
    let tmp_num = 0;
    while(devices.some(device => device.name === device_name)){
        tmp_num+=1;
        device_name = "device-"+String(tmp_num);
    }

    let dev1 : Device = {name:device_name, isNetwork:false, id:lastID};
    dev1.image="";
    dev1.isRouter=false;
    dev1.flavor="";
    dev1.users=[];
    dev1.softwares=[];
    dev1.vulnerabilities=[];
    dev1.fileObjects=[];

    lastID=lastID+1;
    devices.push(dev1);
    console.log("adding new device");
    return dev1;
}
export function getDevices() : Device[] {
    return devices;
}
export function getDeviceCount() : number{
    return devices.length;
}

export function getDeviceIDs(): number[]{
    const deviceIDs = devices.map(device => device.id);
    return deviceIDs;
}
export function getDevice(ID: number): Device|null{
    const device = devices.filter(
        (item) => (item.id==ID)
    );
    
    if(device.length==1){
        return device[0];
    }
    return null;
}

//selected device or entry
export function selectEntry(entry: Network|Device) : boolean{
    if(selectedEntry === entry){
    console.log(`entry ${entry.name} already selected`);
        return false;
    }

    if(delete_target!==null && delete_target != "nodes" && delete_target != "networks"){
        delete_target=null;
        //deactivating entry specific deletion processes
        //closes delete dialog for device properties, when other device is no longer selected 
    }

    selectedEntry = entry;
    console.log(`entry ${entry.name} selected`);

    selectedEntryChangedOdd = !selectedEntryChangedOdd;
    selectedEntryListeners.forEach((listener) => listener(selectedEntryChangedOdd));
    return true;
}
export function deselect(){
    selectedEntry = null;
    selectedEntryChangedOdd = !selectedEntryChangedOdd;
    selectedEntryListeners.forEach((listener) => listener(selectedEntryChangedOdd));
}
export function getSelected() : Network|Device|null {
    return selectedEntry;
}

//event emitter
let selectedEntryChangedOdd: boolean = false;
type selectedEntryListener = (value: boolean) => void;
let selectedEntryListeners: selectedEntryListener[]=[];

export function subscribeToSelectedEntry(listener : selectedEntryListener){
    listener(selectedEntryChangedOdd);
    selectedEntryListeners.push(listener);

    return ()=>{
        const i = selectedEntryListeners.indexOf(listener);
        if(i>=0) selectedEntryListeners.splice(i, 1)
    };
}

//File handling
let file : File|null = null;
export function getFile() : File|null  {
    return file;
}
export function  setFile(new_file : File|null ) {
    file = new_file;

    if(file === null){
        return;
    }

    //load scenario
    file.text().then(contents => loadScenario(contents));
}

let fileHandle : FileSystemFileHandle|null = null;
export function  setFileHandle(new_fileHandle : FileSystemFileHandle|null) {
    fileHandle = new_fileHandle;
}
export function getFileHandle() : FileSystemFileHandle|null  {
    return fileHandle;
}

//Environmental constraints
export type Image = {
    image: string;
    OS: string;
    user: string|null;
    protocol: string|null;
    ansible: any|null;
}
export type Flavor = {
    flavor: string;
    vCPU: number|null;
    RAM: number|null;
    disk: number|null;
}

let AvailableImages : Image[] = [];
let EnvironmentalLimits : any|null = null;
let BaseboxesLimits : any|null = null;


export function loadEnvConstraints(){
    EnvironmentalLimits = DefaultEnvLimits;
    return;
}

export async function uploadEnvConstraints(new_EL:File){
    return new_EL.text().then(
        text=>{
            try{
                const json = JSON.parse(text);
                EnvironmentalLimits = json;
            }
            catch(err){
                const message = err instanceof Error ? err.message : String(err);
                error_message = message;
            }
        }
    );
}

export function getEnvConstraints():string {
    if(EnvironmentalLimits===null){
        loadEnvConstraints();
    }
    return JSON.stringify(EnvironmentalLimits,null,1);
}

export function loadAvailableImages(){

    let validImages : Image[] = [];

    //fallback to defaults
    if(BaseboxesLimits===null){
        BaseboxesLimits = DefaultBaseBoxes;
    }

    const baseboxes = Object.entries(BaseboxesLimits);
    for(const[name, details] of baseboxes){
        let image_OS: string = "unknown";
        let mgmt_user:string|null = null;
        let mgmt_protocol:string|null = null;
        let ansible:any|null = null;

        if(
            typeof details === 'object' &&
            details !== null
        ){
            if('OS' in details && typeof details.OS === 'string'){
                image_OS = details.OS;
            }
            if('mgmt_user' in details && typeof details.mgmt_user === 'string'){
                mgmt_user = details.mgmt_user;
            }
            if('mgmt_protocol' in details && typeof details.mgmt_protocol === 'string'){
                mgmt_protocol = details.mgmt_protocol;
            }
            if('ansible' in details){
                ansible = details.ansible;
            }
        }

        validImages.push({
            image: name,
            OS: image_OS,
            user: mgmt_user,
            protocol: mgmt_protocol,
            ansible:ansible
        })
    }
    
    AvailableImages = validImages;
    return;
}

export async function uploadBaseboxLimits(new_EL:File){
    return new_EL.text().then(
        text=>{
            try{
                const yaml = YAML.parse(text);
                BaseboxesLimits = yaml;
                loadAvailableImages();
            }
            catch(err){
                const message = err instanceof Error ? err.message : String(err);
                error_message = message;
            }
        }
    );
}

export function getBaseboxLimits():string {
    if(BaseboxesLimits===null){
        loadAvailableImages();
    }
    return YAML.stringify(BaseboxesLimits,null,1);
}

export function getAllowedImages() : Image[] {
    
    if(EnvironmentalLimits===null){
        loadEnvConstraints();
    }
    if(AvailableImages.length==0){
        loadAvailableImages();
    }
    if(EnvironmentalLimits===null || AvailableImages.length==0){
        return [];
    }
    
    return AvailableImages.filter((item)=>EnvironmentalLimits?.base_boxes?.allowed.includes(item.image));
}

export function memsize_to_str(memory_size: number) : string{
    
    if(memory_size> 1_000_000_000_000){
        return Number((memory_size/1_000_000_000_000).toPrecision(4)).toString()+" TB";
    }
     
    if(memory_size> 1_000_000_000){
        return Number((memory_size/1_000_000_000).toPrecision(4)).toString()+" GB";
    }
     
    if(memory_size> 1_000_000){
        return Number((memory_size/1_000_000).toPrecision(4)).toString()+" MB";
    }
     
    if(memory_size> 1_000){
        return Number((memory_size/1_000).toPrecision(4)).toString()+" KB";
    }
    return memory_size.toString() + " B";
}

export function getAllowedFlavors() : Flavor[] {
    if(EnvironmentalLimits===null){
        loadEnvConstraints();
    }

    let validFlavors : Flavor[] = [];
    const env_limits = Object.entries(EnvironmentalLimits);

    //check whether allowd flavors are specified
    const allowed_flavors_yaml = EnvironmentalLimits?.flavors?.allowed ?? null;
    if(allowed_flavors_yaml===null){
        return [];
    }
    const allowed_flavors = Object.entries(allowed_flavors_yaml);

    for(const[name, details] of allowed_flavors){
        let vCPU: number|null = null;
        let RAM: number|null = null;
        let disk: number|null = null;

        if(typeof details !== 'object' || details === null){
            continue;
        }

        if('vCPU' in details && typeof details.vCPU === 'number'){
            vCPU = details.vCPU;
        }
        if('RAM' in details && typeof details.RAM === 'number'){
            RAM = details.RAM;
        }
        if('disk' in details && typeof details.disk === 'number'){
            disk = details.disk;
        }

        validFlavors.push({
            flavor: name,
            vCPU: vCPU,
            RAM: RAM,
            disk: disk
        })
    }

    return validFlavors;
}

//provisioning properties
export type User = {
    name: string;
    password: string;
    isAdmin: boolean;
}

export type FileObject = {
    filepath: string;
    isDirectory: boolean;
    owner: User|null;

    acl_R: User[];
    acl_NR: User[];
    acl_W: User[];
    acl_NW: User[];
    acl_E: User[];
    acl_NE: User[];
}

export function getUser(device: Device, name:string) : User|null{
    const found_users = device?.users.filter((user:User) => user.name==name);
    return found_users?.length >=1 ? found_users[0] : null;
}

export function getFO(device: Device, filepath:string) : FileObject|null{
    const found_files = device?.fileObjects.filter((FO:FileObject) => FO.filepath==filepath);
    return found_files?.length >=1 ? found_files[0] : null;
}

export function getDeviceByName(name: string) : Device|null{
    const found_devices = devices.filter((dev)=>dev.name==name);
    if(found_devices.length<=0){
        return null;
    }
    return found_devices[0];
}

//deletion handling

export function getTrashBinIcon(isPressed:boolean): any {
    return(
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isPressed ? 'invertColor border' : 'transparentBorder border'}
        >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 9v8" />
            <path d="M14 9v8" />
        </svg>
    )
}

export function setDeleteTarget(target: string){

    if(delete_target==target){
        delete_target=null;
        return;
    }

    delete_target = target;
    return;
}

export function getDeleteTarget(): string|null{
    return delete_target;
}

export function deleteNetwork(index:number){
    const deleted_network = networks.splice(index, 1)[0];
    if(deleted_network==selectedEntry){
        deselect()
    }
}

export function deleteNode(index:number){
    const deleted_device = devices.splice(index, 1)[0];
    
    if(deleted_device==selectedEntry){
        deselect()
    }
    networks.forEach((net:Network)=>deleteConnection(net,deleted_device.id));
}

export function deleteConnection(net:Network, devID:number){
    let targeted_index: number = net?.connected?.findIndex((item:number)=>item==devID);
    if(targeted_index<0){
        return;
    }

    net?.connected?.splice(targeted_index,1);
    net?.specified?.splice(targeted_index,1);
}

export function deleteFirewallRules(net:Network, index:number){
    net?.firewallRules?.splice(index,1);
}

export function removeUserMentionsFromFO(FO:FileObject, del_user:User){
    if(FO.owner==del_user){
        FO.owner=null;
    }

    FO.acl_R=FO.acl_R.filter((item)=>item!=del_user);
    FO.acl_W=FO.acl_W.filter((item)=>item!=del_user);
    FO.acl_E=FO.acl_E.filter((item)=>item!=del_user);

    FO.acl_NR=FO.acl_NR.filter((item)=>item!=del_user);
    FO.acl_NW=FO.acl_NW.filter((item)=>item!=del_user);
    FO.acl_NE=FO.acl_NE.filter((item)=>item!=del_user);
}

export function deleteDeviceStatement(dev:Device, field:string, index:number){

    if(field=="softwares"){
        dev?.softwares?.splice(index, 1);
    }
    else if(field=="vulnerabilities"){
        dev?.vulnerabilities?.splice(index, 1);
    }
    else if(field=="file_objects"){
        dev?.fileObjects?.splice(index, 1);
    }
    else if(field=="users"){
        const del_user = dev?.users?.splice(index, 1)[0];

        //remove related FO permissions
        dev?.fileObjects?.forEach(
            (FO:FileObject)=>removeUserMentionsFromFO(FO, del_user)
        );
    }
    else{
        console.log(`unknown field for device ${field}`);
        return;
    }
}

//load scenario
export function safe_split(line: string) : string[] {

    //pad brackets
    line=line.replace(/\(/," ( ").replace(/\{/," { ").replace(/\}/," } ").replace(/\)/," ) ").replace(/\;/," ; ");

    if(!(line.includes('"'))){
        const words = line.split(/\s+/);
        return words.filter(word=>word.length>0);
    }
    
    let words:string[] = [];
    let in_quotes: boolean = false;
    let next_word:string = "";
    let prev_symbol:string = "";

    for(const symbol of line){

        //handle whitespaces between words
        if(!in_quotes && /\s/.test(symbol)){

            if(next_word.length>0){
                words.push(next_word);
            }

            next_word="";
            continue;
        }

        //start quotation
        if(!in_quotes && symbol == '"'){
            in_quotes=true;
            continue;
        }

        //end quotation
        if(in_quotes && symbol == '"' && !next_word.endsWith('\\')){
            in_quotes=false;

            words.push(next_word.replace(/\\"/,'"'));
            next_word="";
            continue;
        }

        next_word = next_word + symbol;
    }

    if(next_word.length>0){
        words.push(next_word);
    }

    return words;
}

export function customConcat(words:string[], delimeter:string=" "){

    let del: string = "";
    let line:string = "";

    for(const word of words){
        line = line + del + word;
        del = delimeter;
    }

    return line;
}

let scenario_name:string = "generated-game";
export function getScenarioName():string{
    return scenario_name;
}

export function loadScenario(scenario: string){
    const lines:string[] = scenario.split("\n");

    devices=[];
    networks=[];
    scenario_name = "generated-game"
    let new_entry: Device|Network|null = null;

    for(const line of lines){
        const raw_words: string[] = safe_split(line);
        const words: string[] = raw_words.filter(word=>word!=";");
        console.log(`${words}`);

        if(words[0]=="node" && words.length >= 2 && new_entry===null){
            new_entry = newDevice();
            new_entry.name=words[1];
        }
        else if(words[0]=="network" && words.length >= 2 && new_entry===null){
            new_entry = newNetwork();
            new_entry.name=words[1];
        }
        else if(words[0]=="scenario" && words.length >= 2 && new_entry===null && devices.length==0 && networks.length==0){
            scenario_name=words[1];
        }
        else if(words[0]=="}" && words.length >= 1 && new_entry!=null){
            new_entry = null;
        }
        else if(new_entry!=null && words.length>=2){

            if(new_entry!=null && new_entry.isNetwork){
                const net: Network = new_entry;

                if((words[0].toLowerCase()=="ip" || words[0]=="address" || words[0]=="addresses") && words.length>=6){
                    const net_id : string = words[3];
                    const broadcast : string = words[5];

                    net.ip = net_id;
                    net.brd = broadcast;
                }
                if(words[0]=="is" && words[2]=="accessible" && words.length>=3){
                    net.accessible = true;
                }
                if(words[0]=="not" && words[3]=="accessible" && words.length>=3){
                    net.accessible = false;
                }
                if(words[0]=="node" && words.length>=4){
                    const node_name:string = words[1]
                    const specific_ip:string = (words.length>=5) ? words[4] : "";

                    const connected_device = getDeviceByName(node_name);
                    if(connected_device===null){
                        continue;
                    }

                    net.connected.push(connected_device.id);
                    net.specified.push(specific_ip);
                }
                if(words[0]=="firewall" && words.length>=4){
                    const rule:string = words[1];
                    const type:string = words[2];
                    const operand1:string = words[3];
                    const operand2:string = (words.length>=6) ? words[5] : "";

                    const new_rule:Firewall_rule = {rule:rule, addressType:type,operand1:operand1, operand2:operand2};
                    net.firewallRules.push(new_rule);
                }
            }
            else if(new_entry!=null && !new_entry.isNetwork){
                const dev: Device = new_entry;
                
                if(words[0]=="basebox" && words.length>=3){
                    dev.image = words[2];
                }
                if(words[0]=="type" && words.length>=3){
                    dev.isRouter = words[2]=="router";
                }
                if(words[0]=="flavor" && words.length>=3){
                    dev.flavor = words[2];
                }
                if(words[0]=="exists" && words.length>=3){
                    console.log("adding readen user")
                    const users:User[] = dev.users;
                    users.push({name:words[2], password:(words.length>=6?words[5]:""), isAdmin:false});
                }
                if(words[0]=="user" && words.length>=4 && (words[3]=="sudo" || words[3]=="admin")){
                    const user = getUser(dev, words[1]);
                    if(user!=null){
                        user.isAdmin=true;
                    }
                }
                if(words[0]=="mounts" && words.length>=3){
                    const remainder = words;
                    remainder.splice(0,2);

                    if(remainder[remainder.length-1]==";"){
                        remainder.pop();
                    }

                    dev.softwares.push(customConcat(remainder));
                }
                if(words[0]=="suffers" && words.length>=3){
                    dev.vulnerabilities.push(words[2]);
                }
                if(words[0]=="user" && words.length>=5 && (words[3]=="read" || words[3]=="write" || words[3]=="execute")){
                    const user = getUser(dev, words[1]);
                    const FO = getFO(dev, words[4]);
                    const op = words[3];

                    if(user===null || FO===null){
                        continue;
                    }

                    let list_of_users: User[] = op=="read"?FO.acl_R:(op=="write"?FO.acl_W:FO.acl_E);
                    list_of_users.push(user);
                }
                if(words[0]=="not" && words[1]=="user" && words.length>=6 && (words[4]=="read" || words[4]=="write" || words[4]=="execute")){
                    const user = getUser(dev, words[2]);
                    const FO = getFO(dev, words[5]);
                    const op = words[4];

                    if(user===null || FO===null){
                        continue;
                    }

                    let list_of_users: User[] = op=="read"?FO.acl_NR:(op=="write"?FO.acl_NW:FO.acl_NE);
                    list_of_users.push(user);
                }
                if(words[0]=="contains" && words.length>=3){
                    const isDir:boolean = !(words[1]=="file");
                    const owner:User|null = words.length>=6?getUser(dev,words[5]):null;

                    const FO: FileObject = {filepath:words[2],owner:owner,isDirectory:isDir,
                        acl_R:[],acl_W:[],acl_E:[],acl_NR:[],acl_NW:[],acl_NE:[]};
                    dev.fileObjects.push(FO);
                }

            }
        }

    }

    deselect();
}

//save scenario

export function smartQuotes(text:string):string{
    if(text.includes(" ")){
        return '"'+text+'"';
    }
    return text;
}

export function stringifyScenario():string{
    let scenario_text:string = "";

    scenario_text+="scenario "+scenario_name+" {\n";

    //devices
    for(const dev of devices){
        scenario_text+="node "+dev.name+" {\n";

        if(dev.image!=""){
            scenario_text+="\tbasebox is "+dev.image+";\n";
        }

        if(dev.flavor!=""){
            scenario_text+="\tflavor is "+dev.flavor+";\n";
        }

        if(dev.isRouter){
            scenario_text+="\ttype is router;\n";
        }

        if(dev.image!="" || dev.flavor!="" || dev.isRouter){//seperator for readability
            scenario_text+="\n";
        }

        for(const user_entry of dev.users){
            const user:User = user_entry;

            scenario_text+="\texists user "+smartQuotes(user.name);
            if(user.password!=""){
                scenario_text+=" with password "+smartQuotes(user.password);
            }
            scenario_text+=";\n";

            if(user.isAdmin){
                scenario_text+="\tuser "+smartQuotes(user.name)+" can sudo;\n";
            }
        }

        if(dev.users.length>0){//seperator for readability
            scenario_text+="\n";
        }

        for(const software_entry of dev.softwares){
            const software:string = software_entry;

            scenario_text+="\tmounts software "+software+";\n";
        }

        if(dev.softwares.length>0){//seperator for readability
            scenario_text+="\n";
        }
        
        for(const vulnerability_entry of dev.vulnerabilities){
            const vulnerability:string = vulnerability_entry;

            scenario_text+="\tsuffers from "+vulnerability+";\n";
        }

        if(dev.fileObjects.vulnerabilities>0){//seperator for readability
            scenario_text+="\n";
        }

        for(const FO_entry of dev.fileObjects){
            const FO:FileObject = FO_entry;

            scenario_text+="\tcontains "+(FO.isDirectory?"directory":"file");
            scenario_text+=" "+smartQuotes(FO.filepath);

            if(FO.owner!=null){
                scenario_text+=" owned by "+smartQuotes(FO.owner.name);
            }
            scenario_text+=";\n";

            for(const R_entry of FO.acl_R){
                const R:User = R_entry;
                scenario_text+="\tuser "+smartQuotes(R.name)+" can read "+smartQuotes(FO.filepath)+";\n";
            }
            for(const NR_entry of FO.acl_NR){
                const NR:User = NR_entry;
                scenario_text+="\tnot user "+smartQuotes(NR.name)+" can read "+smartQuotes(FO.filepath)+";\n";
            }

            for(const W_entry of FO.acl_W){
                const W:User = W_entry;
                scenario_text+="\tuser "+smartQuotes(W.name)+" can write "+smartQuotes(FO.filepath)+";\n";
            }
            for(const NW_entry of FO.acl_NW){
                const NW:User = NW_entry;
                scenario_text+="\tnot user "+smartQuotes(NW.name)+" can write "+smartQuotes(FO.filepath)+";\n";
            }

            for(const E_entry of FO.acl_E){
                const E:User = E_entry;
                scenario_text+="\tuser "+smartQuotes(E.name)+" can execute "+smartQuotes(FO.filepath)+";\n";
            }
            for(const NE_entry of FO.acl_NE){
                const NE:User = NE_entry;
                scenario_text+="\tnot user "+smartQuotes(NE.name)+" can execute "+smartQuotes(FO.filepath)+";\n";
            }

            if(FO.acl_R.length+FO.acl_W.length+FO.acl_E.length+FO.acl_NR.length+FO.acl_NW.length+FO.acl_NE.length>0){//seperator for readability
                scenario_text+="\n";
            }
        }
        
        scenario_text+="}\n";
    }

    //networks
    for(const net of networks){
        scenario_text+="network "+net.name+" {\n";

        scenario_text+="\tip range from "+net.ip+" to "+net.brd+";\n";
        if(net.accessible==false){
            scenario_text+="not is user accessible;\n";
        }
        scenario_text+="\n";
        
        for(let index:number = 0; (index<net.connected.length) && (index<net.specified.length); index++){
            const device_id:number = net.connected[index];
            const specific_ip:string = net.specified[index];

            const connected_device:Device|null = getDevice(device_id);
            if(connected_device===null){
                continue;
            }

            scenario_text+="\tnode "+connected_device.name+" ";
            if(specific_ip!=""){
                scenario_text+="has IP "+specific_ip;
            }
            else{
                scenario_text+="is connected";
            }

            scenario_text+=";\n";
        }

        if(0<net.connected.length && 0<net.specified.length){
            scenario_text+="\n";
        }

        for(const firewall_rule_entry of net.firewallRules){
            const rule:Firewall_rule = firewall_rule_entry;

            scenario_text+="\tfirewall "+rule.rule+" "+rule.addressType+" "+rule.operand1;
            if(rule.rule=="forwards"){
                scenario_text+=" to "+rule.operand2;
            }
            scenario_text+=";\n";
        }
        
        scenario_text+="}\n";
    }

    scenario_text+="}\n";

    return scenario_text;
}

export function ip_str_to_num(ip:string):number|null{
    const segments = ip.trim().split('.');
    if(segments.length!=4){
        return null;
    }

    let ip_num:number = 0;
    for(const segment of segments){
        const segment_num = Number(segment);

        if(Number.isNaN(segment_num) || segment_num<0 || segment_num>=256){
            return null;
        }
        ip_num*=256;
        ip_num+=segment_num
    }
    return ip_num;
}

export function port_str_to_num(port:string):number|null{
    const port_num:number = Number(port);
    if(Number.isNaN(port_num) || !Number.isInteger(port_num) || port_num<0){
        return null;
    }
    return port_num;
}

export function verifyScenario():boolean {

    //check networks
    for(const net of networks){
        const start_str:string = net.ip;
        const end_str:string = net.brd;

        let start:number|null = ip_str_to_num(start_str);
        if(start == null){
            error_message="the network "+net.name+" does not have valid ip range start: "+start_str;
            return false;
        }
        start=start-start%2;

        let end:number|null = ip_str_to_num(end_str);
        if(end == null){
            error_message="the network "+net.name+" does not have valid ip range end: "+end_str;
            return false;
        }
        end=end+end%2;

        const net_size:number = end-start;
        if((net_size & (net_size-1)) !==0){
            error_message="the network "+net.name+" has bad network size: "+net_size;
            return false;
        }
        if(start%net_size!=0){
            error_message="the network "+net.name+" has bad start for its mask: "+start_str+" and size:"+net_size;
            return false;
        }

        if(net.connected.length>net_size-2){
            error_message="the network "+net.name+" has too many connected nodes: "+net.connected.length+" / "+(net_size-2);
            return false;
        }

        //check connected devices
        for(let index:number = 0; (index<net.connected.length) && (index<net.specified.length); index++){
            const device_id:number = net.connected[index];
            const specific_ip:string = net.specified[index];

            if(specific_ip==""){
                continue;
            }

            const node_ip = ip_str_to_num(specific_ip);
            if(node_ip===null || node_ip<=start || node_ip>=end){
                error_message="the network "+net.name+" has invalid connection to: "+getDevice(device_id)?.name +" by "+specific_ip;
                return false;
            }
        }

        //check firewall rules
        for(const rule_entry of net.firewallRules){
            const rule:Firewall_rule = rule_entry;

            const ip_op1 = ip_str_to_num(rule.operand1);
            const ip_op2 = ip_str_to_num(rule.operand2);
            const port_op1 = port_str_to_num(rule.operand1);
            const port_op2 = port_str_to_num(rule.operand2);

            if((rule.addressType=="ip" && ip_op1===null) || (rule.addressType=="port" && port_op1===null)){
                error_message="the network "+net.name+" has invalid firewall rule: "+rule.rule+" "+rule.addressType+" "+rule.operand1;
                return false;
            }
            if(rule.rule!="forwards"){
                continue;
            }
            if((rule.addressType=="ip" && ip_op2===null) || (rule.addressType=="port" && port_op2===null)){
                error_message="the network "+net.name+" has invalid firewall rule: "+rule.rule+" "+rule.addressType+" to "+rule.operand2;
                return false;
            }
        }
    }

    //check devices
    const allowed_flavors = getAllowedFlavors();
    const allowed_images = getAllowedImages();

    if(allowed_flavors.length==0){
        error_message="no flavors supported!";
        return false;
    }

    if(allowed_images.length==0){
        error_message="no images supported!";
        return false;
    }

    if(EnvironmentalLimits===null){
        loadEnvConstraints();
    }

    //getting basic environmental constraints
    const ind_max_disk = EnvironmentalLimits?.disk["individual.max"] ?? Number.MAX_SAFE_INTEGER;
    const tot_max_disk = EnvironmentalLimits?.disk["total.max"] ?? Number.MAX_SAFE_INTEGER;
    let total_disk: number = 0;
    const ind_max_ram = EnvironmentalLimits?.memory["individual.max"] ?? Number.MAX_SAFE_INTEGER;
    const tot_max_ram = EnvironmentalLimits?.memory["total.max"] ?? Number.MAX_SAFE_INTEGER;
    let total_ram: number = 0;

    //checking individual devices
    for(const dev of devices){

        //checking image
        if(dev.image==""){
            dev.image=allowed_images[0].image;
        }
        if(!allowed_images.some((image=>image.image==dev.image))){
            error_message="device "+dev.name+" has unsupported image: "+dev.image;
            return false;
        }

        //checking flavor
        if(dev.flavor==""){
            dev.flavor=allowed_flavors[0].flavor;
        }

        const dev_flavor = allowed_flavors.filter((flavor=>flavor.flavor==dev.flavor))
        if(dev_flavor.length==0){
            error_message="device "+dev.name+" has unsupported flavor: "+dev.flavor;
            return false;
        }

        //disk
        const dev_disk = dev_flavor[0].disk ?? 0;
        if(dev_disk>ind_max_disk){
            error_message="device "+dev.name+" needs too much disk: "+memsize_to_str(dev_disk)+" / "+memsize_to_str(ind_max_disk);
            return false;
        }
        total_disk += dev_disk;

        //RAM
        const dev_ram = dev_flavor[0].RAM ?? 0;
        if(dev_ram>ind_max_ram){
            error_message="device "+dev.name+" needs too much ram: "+memsize_to_str(dev_ram)+" / "+memsize_to_str(ind_max_ram);
            return false;
        }
        total_ram += dev_ram;

    }

    //checking total limits
    if(total_disk>tot_max_disk){
        error_message="devices need too much disk: "+memsize_to_str(total_disk)+" / "+memsize_to_str(tot_max_disk);
        return false;
    }
    if(total_ram>tot_max_ram){
        error_message="devices need too much ram: "+memsize_to_str(total_ram)+" / "+memsize_to_str(tot_max_ram);
        return false;
    }

    return true;
}

//zipped files
export function place_file_to_zip(zip:JSZip, filepath:string, contents:string|Blob){
    if(zip.file(filepath)){
        zip.remove(filepath);
    }
    zip.file(filepath,contents);
}

export async function getV2K():Promise<Blob|null>{
    const V2K_zip_response = await fetch("VSDL-to-KYPO-main.zip");
    if(!V2K_zip_response.ok){
        error_message = "corrupted translator file!";
        return null;
    }

    const V2K_zip = await V2K_zip_response.blob();
    const zip = await JSZip.loadAsync(V2K_zip);

    place_file_to_zip(zip,"input.vsdl",stringifyScenario());
    place_file_to_zip(zip,"data/limits.json",getEnvConstraints());
    place_file_to_zip(zip,"data/base_boxes.yml",getBaseboxLimits());

    return zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
    });
}