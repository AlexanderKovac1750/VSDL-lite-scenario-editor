import YAML from 'yaml';
import JSZip from "jszip";

import { User, verifyScenario, ip_str_to_num, getAllowedImages, Image, getScenarioName, getNetworks, Network, getDevices, Device, place_file_to_zip, setErrorMessage, getDevice, FileObject, Firewall_rule } from './globals';

export function getImagebyName(name:string):Image|null{
    const images = getAllowedImages();
    const found = images.filter(image=>image.image==name);
    if(found.length<=0){
        return null;
    }
    return found[0];
}

export function ip_num_to_str(ip_num:number):string {
    let segments:number[]=[];
    while(ip_num>0){
        segments.push(ip_num%256);
        ip_num-=ip_num%256;
        ip_num/=256;
    }

    segments.reverse();
    return segments.join(".");
}

export function getNetRange(net:Network):{cidr:string, start:number, end:number}|null{
    const start_str:string = net.ip;
    const end_str:string = net.brd;
    
    let start:number|null = ip_str_to_num(start_str);
    if(start == null){
        setErrorMessage("the network "+net.name+" does not have valid ip range start: "+start_str);
        return null;
    }
    start=start-start%2;
    
    let end:number|null = ip_str_to_num(end_str);
    if(end == null){
        setErrorMessage("the network "+net.name+" does not have valid ip range end: "+end_str);
        return null;
    }
    end=end+end%2;
    
    let net_size:number = end-start;
    if((net_size & (net_size-1)) !==0){
        setErrorMessage("the network "+net.name+" has bad network size: "+net_size);
        return null;
    }
    if(start%net_size!=0){
        setErrorMessage("the network "+net.name+" has bad start for its mask: "+start_str+" and size:"+net_size);
        return null;
    }
    
    if(net.connected.length>net_size-2){
        setErrorMessage("the network "+net.name+" has too many connected nodes: "+net.connected.length+" / "+(net_size-2));
        return null;
    }

    let mask=32;
    while(net_size>1){
        mask--;
        net_size/=2;
    }

    return {cidr:ip_num_to_str(start)+"/"+mask, start, end};
}

export function generateTopology(networks:Network[], devices:Device[]):any{
    
    //filter devices to hosts and routers
    let hosts:Device[] = [];
    let routers:Device[] = [];
    for(const dev of devices){
        (dev.isRouter ? routers : hosts).push(dev);
    }

    let topology: any = new Object();
    topology["name"]=getScenarioName();

    let hosts_yaml:any[] = []
    let routers_yaml:any[] = []

    for(const dev of devices){
        let dev_yaml:any = new Object();
        dev_yaml["name"]=dev.name;
        dev_yaml["flavor"]=dev.flavor;

        const image:Image|null = getImagebyName(dev.image);
        if(image===null){
            setErrorMessage(`the device ${dev.name} has unknown image: ${dev.image}`);
            return null;
        }

        let BB:any = new Object();
        BB["image"]=image.image;
        if(image.user!==null){
            BB["mgmt_user"]=image.user;
        }
        if(image.protocol!==null){
            BB["mgmt_protocol"]=image.protocol;
        }
        
        dev_yaml["base_box"]=BB
        if(dev.isRouter){
            routers_yaml.push(dev_yaml);
        }
        else{
            hosts_yaml.push(dev_yaml);
        }
    }
    topology["hosts"]=hosts_yaml;
    topology["routers"]=routers_yaml;
    topology["wan"]={name:"internet-connection",cidr:"100.100.100.0/24"};

    let networks_yaml:any[]=[];
    let net_napping:any[]=[];
    let router_napping:any[]=[];
    
    for(const net of networks){

        //networks
        const net_range = getNetRange(net);
        if(net_range===null){
            return null;
        }

        let net_yaml:any=new Object();
        net_yaml["name"]=net.name;
        net_yaml["cidr"]=net_range.cidr;
        networks_yaml.push(net_yaml);

        //connected devices
        let used_ips:Set<number>=new Set();
        let unspecified:Set<number>=new Set();

        for(let index:number = 0; (index<net.connected.length) && (index<net.specified.length); index++){
            const device_id:number = net.connected[index];
            let specific_ip:string = net.specified[index];

            const dev:Device|null = getDevice(device_id);
            if(dev===null){
                continue;
            }

            const mappings = dev.isRouter ? router_napping : net_napping;
            let mapping_yaml:any = new Object();
        
            if(specific_ip==""){

                if(!used_ips.has(net_range.start+1) && dev.isRouter){
                    specific_ip=ip_num_to_str(net_range.start+1);
                }
                else{
                    unspecified.add(index);
                    continue;
                }
            }

            const ip_num = ip_str_to_num(specific_ip);
            if(ip_num===null){
                setErrorMessage("the network "+net.name+" has invalid connection to: "+getDevice(device_id)?.name +" by "+specific_ip);
                return null;
            }
            used_ips.add(ip_num);

            mapping_yaml[dev.isRouter ? "router" : "host"]=dev.name;
            mapping_yaml["network"]=net.name;
            mapping_yaml["ip"]=specific_ip;
            mappings.push(mapping_yaml);
        }
        
        let unspecified_indexes:number[]=[];
        unspecified.forEach(entry => {unspecified_indexes.push(entry);});

        for(const index of unspecified_indexes){
            const device_id:number = net.connected[index];
            let specific_ip:string = net.specified[index];

            const dev:Device|null = getDevice(device_id);
            console.log(`assigning ip to unspecified ${dev?.name}`);
            if(dev===null){
                continue;
            }
            
            const mappings = dev.isRouter ? router_napping : net_napping;
            let mapping_yaml:any = new Object();

            //assign ip
            let rand_ip = net_range.start+2;
            while(used_ips.has(rand_ip)){
                rand_ip++;
            }
            if(rand_ip>=net_range.end-1){
                setErrorMessage("the network "+net.name+" does not have enough address space for all unspecified connected devices!");
                return null;
            }
            specific_ip=ip_num_to_str(rand_ip);

            const ip_num = ip_str_to_num(specific_ip);
            if(ip_num===null){
                setErrorMessage("the network "+net.name+" has invalid connection to: "+getDevice(device_id)?.name +" by "+specific_ip);
                return null;
            }
            used_ips.add(ip_num);
            
            mapping_yaml[dev.isRouter ? "router" : "host"]=dev.name;
            mapping_yaml["network"]=net.name;
            mapping_yaml["ip"]=specific_ip;
            mappings.push(mapping_yaml);
        }
    }

    topology["networks"]=networks_yaml;
    topology["net_mappings"]=net_napping;
    topology["router_mappings"]=router_napping;
    topology["groups"]=[];

    return topology;
}

export type permission = {
    path:string;
    user:string;
    mode:string;
}

function get_permission_entry(permission_list:permission[], FO:FileObject, user:User):permission{
    const existing_perms = permission_list.filter(entry=>entry.user==user.name && entry.path==FO.filepath);

    if(existing_perms.length>0){
        return existing_perms[0];
    }

    let new_perm:permission = {
        path:FO.filepath,
        user:user.name,
        mode:"r"+(FO.owner==user ? "w" : "")+((FO.owner==user || FO.isDirectory) ? "x" : "")
    }
    permission_list.push(new_perm);
    return new_perm;
}

export function provisionDevice(zip:JSZip, dev:Device, networks:Network[]):boolean{

    let vars:any=new Object();
    let tasks:any[]=[]

    const image:Image|null = getImagebyName(dev.image);
    if(image===null){
        setErrorMessage(`the device ${dev.name} has unknown image: ${dev.image}`);
        return false;
    }
    if(image.ansible!==null){
        for(const task of image.ansible){
            tasks.push(task);
        }
    }

    //users
    if(dev.users.length>0){
        let normal_users:any[]=[];
        let sudoers:any[]=[];
        
        for(const user_entry of dev.users){
            const user:User = user_entry;
            const password:string = (user.password=="") ? user.name : user.password;
            
            (user.isAdmin ? sudoers : normal_users).push({
                name: user.name,
                password: password
            })
        }

        const task_users:any = {
            name: "Create users",
            user:{
                name: '{{ item.name }}',
                password: '{{ item.password | password_hash("md5")}}',
                create_home: 'yes',
                shell: "/bin/bash"
            },
            loop: '{{ user_list }}'
        };
        const task_sudoers1:any = {
            name: "Check wheel group",
            group:{
                name: "wheel",
                state: "present"
            }
        }
        const task_sudoers2:any = {
            name: "Allow wheel group to have sudo",
            lineinfile:{
                dest: "/etc/sudoers",
                state: "present",
                regexp: "^%wheel",
                line: '%wheel    ALL=(ALL:ALL) NOPASSWD:ALL',
                validate: "visudo -cf %s"
            }
        }
        const task_sudoers3:any = {
            name: "Create sudoers",
            user:{
                name: '{{ item.name }}',
                password: '{{ item.password | password_hash("md5")}}',
                group: "wheel",
                append: 'yes',
                create_home: 'yes',
                shell: "/bin/bash"
            },
            loop: '{{ sudoer_list }}'
        };

        if(normal_users.length>0){
            vars["user_list"]=normal_users;
            tasks.push(task_users);
        }
        if(sudoers.length>0){
            vars["sudoer_list"]=sudoers;
            tasks.push(task_sudoers1);
            tasks.push(task_sudoers2);
            tasks.push(task_sudoers3);
        }
    }

    //files & directories
    if(dev.fileObjects.length>0){
        let directories:any[] = [];
        let parent_directories:any[] = [];
        let files:any[] = [];
        let permission_list:permission[] = [];

        for(const FO_entry of dev.fileObjects){
            const FO:FileObject = FO_entry;
            const owner:string = (FO.owner===null ? "root" : FO.owner.name);
            const filepath:string = FO.filepath.replace(/\/$/,"").replace(/^\//,"");

            (FO.isDirectory ? directories : files).push({path: filepath, owner:owner});

            //keep track of parent folders
            if(!FO.isDirectory && filepath.includes('/')){
                const parent_fodler = filepath.substring(0,FO.filepath.lastIndexOf('/')).replace(/\/$/,"");
                if(parent_fodler!='.' && parent_fodler!='/'){
                    parent_directories.push({path:parent_fodler, owner:"root"});
                }
            }

            const path1 = (FO.filepath.startsWith("/") ? FO.filepath : "/"+FO.filepath);
            const path2 = "sandbox/provisioning/roles/"+dev.name+"/files"+path1;
            if(!FO.isDirectory){
                place_file_to_zip(zip, path2, new Blob());
            }
            else{
                zip.folder(path2);
            }

            for(const NR_entry of FO.acl_NR){
                const NR:User = NR_entry;
                const permission = get_permission_entry(permission_list, FO, NR);
                permission.mode=permission.mode.replace('r','');
            }
            for(const W_entry of FO.acl_W){
                const W:User = W_entry;
                const permission = get_permission_entry(permission_list, FO, W);

                if(permission.mode.includes('w')){
                    continue;
                }

                permission.mode=permission.mode.replace('r','rw');
                if(!permission.mode.includes('w')){
                    permission.mode='w'+permission.mode;
                }
            }
            for(const NW_entry of FO.acl_NW){
                const NW:User = NW_entry;
                const permission = get_permission_entry(permission_list, FO, NW);
                permission.mode=permission.mode.replace('w','');
            }
            for(const E_entry of FO.acl_E){
                const E:User = E_entry;
                const permission = get_permission_entry(permission_list, FO, E);
                if(!permission.mode.endsWith('x')){
                    permission.mode+='x';
                }
            }
            for(const NE_entry of FO.acl_NE){
                const NE:User = NE_entry;
                const permission = get_permission_entry(permission_list, FO, NE);
                permission.mode=permission.mode.replace('x','');
            }
        }
        
        for(const parent_dir of parent_directories){
            if(!directories.some((dir)=>dir.path==parent_dir.path)){
                directories.push(parent_dir);
            }
        }
        
        for(const permission of permission_list){
            if(permission.mode==""){
                permission.mode='-';
            }
        }

        const task_directories: any = {
            name:"Create directories",
            file:{
                path: '/{{ item.path }}',
                state: 'directory',
                mode: '0755',
                owner: '{{ item.owner }}'
            },
            loop: '{{ directory_list }}'
        }
        const task_files: any = {
            name: "Copy files",
            copy:{
                src: '../files/{{ item.path }}',
                dest: '/{{ item.path }}',
                mode: '0744',
                owner: '{{ item.owner }}'
            },
            loop: '{{ file_list }}'
        }
        const task_permissions: any = {
            name: "Modify ACL",
            acl:{
                default: false,
                state: 'present',
                entity: '{{ item.user }}',
                etype: 'user',
                path: '/{{ item.path }}',
                permissions: '{{ item.mode }}'
            },
            loop: '{{ permission_list }}'
        }

        if(directories.length>0){
            vars["directory_list"]=directories;
            tasks.push(task_directories);
        }

        if(files.length>0){
            vars["file_list"]=files;
            tasks.push(task_files);
        }

        if(permission_list.length>0){
            vars["permission_list"]=permission_list;
            tasks.push(task_permissions);
        }

    }

    //software & vulnerabilities
    if(dev.softwares.length>0){
        tasks.push({
            name: 'Install packages',
            apt:{
                name:dev.softwares,
                update_cache: true,
                state: 'present'
            }
        })
    }
    if(dev.vulnerabilities.length>0){
        tasks.push({
            name: 'TODO implement vulnerabilities',
            vulnerabilities: dev.vulnerabilities
        })
    }

    //firewall
    if(dev.isRouter){
        let blocked_ports:any[] = [];
        let blocked_ips:any[] = [];
        let forwarded_ports:any[] = [];
        let forwarded_ips:any[] = [];

        for(const net of networks){

            //get network id
            const net_id = ip_str_to_num(net.ip);
            if(net_id===null){
                continue;
            }

            //determine expected router's ip
            const DG_ip = ip_num_to_str(net_id+1);
            let is_routed_by_dev:boolean = false;
            console.log(`checking ${dev.name} to ${net.name}`);

            //check whether network is routed by this device
            for(let index:number = 0; (index<net.connected.length) && (index<net.specified.length); index++){
                const device_id:number = net.connected[index];
                const specific_ip:string = net.specified[index];

                if((specific_ip==DG_ip || specific_ip=="") && device_id==dev.id){
                    is_routed_by_dev=true;
                    break;
                }
            }

            if(!is_routed_by_dev){
                continue;
            }
            console.log(`FW rules found ${net.firewallRules}`);

            //append firewall entries
            const net_firewall_rules = net.firewallRules;
            for(const net_rule of net_firewall_rules){
                const rule:Firewall_rule = net_rule;
                const net_range = getNetRange(net);

                if(net_range===null){
                    continue;
                }

                //make rule yaml entry
                const source:string = net_range.cidr;
                let rule_yaml:any = new Object();

                rule_yaml[(rule.addressType=="ip" ? "ip" : "port")]=rule.operand1;
                if(rule.rule=="forwards"){
                    rule_yaml[(rule.addressType=="ip" ? "to_ip" : "to_port")]=rule.operand2;
                }
                rule_yaml["source"]=source;

                (rule.rule=="blocks" ? 
                    (rule.addressType=="ip" ? blocked_ips : blocked_ports) 
                    : 
                    (rule.addressType=="ip" ? forwarded_ips : forwarded_ports)
                ).push(rule_yaml)
            }
            
        }

        const task_block_ports:any = {
            name: 'Block ports',
            become: 'yes',
            iptables:{
                chain: 'FORWARD',
                destination_port: '{{ item.port }}',
                source: '{{ item.source }}',
                protocol: 'tcp',
                jump: 'DROP'
            },
            loop: '{{ blocked_ports }}'
        };

        const task_block_ips:any = {
            name: 'Block ips',
            become: 'yes',
            iptables:{
                chain: 'FORWARD',
                destination: '{{ item.ip }}',
                source: '{{ item.source }}',
                protocol: 'tcp',
                jump: 'DROP'
            },
            loop: '{{ blocked_ips }}'
        };

        const task_forward_ports1:any = {
            name: 'Forward ports from network',
            become: 'yes',
            iptables:{
                table: 'nat',
                chain: 'PREROUTING',
                destination_port: '{{ item.port }}',
                to_destination: ':{{ item.to_port }}',
                protocol: 'tcp',
                jump: 'DNAT',
                source: '{{ item.source }}'
            },
            loop: '{{ forward_ports }}'
        };

        const task_forward_ports2:any = {
            name: 'Forward ports to network',
            become: 'yes',
            iptables:{
                table: 'nat',
                chain: 'PREROUTING',
                destination_port: '{{ item.port }}',
                to_destination: ':{{ item.to_port }}',
                protocol: 'tcp',
                jump: 'DNAT',
                destination: '{{ item.source }}'
            },
            loop: '{{ forward_ports }}'
        };

        const task_forward_ips:any = {
            name: 'Forward ips',
            become: 'yes',
            iptables:{
                table: 'nat',
                chain: 'PREROUTING',
                destination: '{{ item.ip }}',
                to_destination: '{{ item.to_ip }}',
                protocol: 'tcp',
                jump: 'DNAT'
            },
            loop: '{{ forward_ips }}'
        }

        if(blocked_ports.length>0){
            vars["blocked_ports"]=blocked_ports;
            tasks.push(task_block_ports);
        }
        if(blocked_ips.length>0){
            vars["blocked_ips"]=blocked_ips;
            tasks.push(task_block_ips);
        }
        if(forwarded_ports.length>0){
            vars["forward_ports"]=forwarded_ports;
            tasks.push(task_forward_ports1);
            tasks.push(task_forward_ports2);
        }
        if(forwarded_ips.length>0){
            vars["forward_ips"]=forwarded_ips;
            tasks.push(task_forward_ips);
        }

    }

    place_file_to_zip(zip, "sandbox/provisioning/roles/"+dev.name+"/tasks/main.yml",YAML.stringify(tasks));
    place_file_to_zip(zip, "sandbox/provisioning/roles/"+dev.name+"/vars/main.yml",YAML.stringify(vars));

    return true
}

export function preparePlaybook(zip:JSZip){
    const devices:Device[] = getDevices();
    let playbook:any[]=[];

    for(const dev of devices){
        place_file_to_zip(zip, "sandbox/provisioning/host_vars/"+dev.name+".yaml",YAML.stringify({ansible_python_interpreter: 'python3'}));

        const playbook_entry:any = {
            hosts: dev.name,
            become: true,
            roles:[ dev.name ]
        }
        playbook.push(playbook_entry);
    }
    place_file_to_zip(zip, "sandbox/provisioning/playbook.yml",YAML.stringify(playbook));
}

export async function generateSandbox(platform: string):Promise<Blob|null>{
    if(!verifyScenario()){
        return null;
    }

    const zip = new JSZip();
    preparePlaybook(zip)

    const topology = generateTopology(getNetworks(), getDevices());
    if(topology===null){
        return null;
    }
    place_file_to_zip(zip, (platform.toLowerCase()=="crp"?"sandbox/":"")+"topology.yml",YAML.stringify(topology));

    for(const dev of getDevices()){
        if(!provisionDevice(zip,dev,getNetworks())){
            return null;
        }
    }

    return zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
    });
}