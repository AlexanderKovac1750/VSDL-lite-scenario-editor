import { useEffect, useState, useRef } from 'react';
import './Editor.css';
import './globals'
import { memsize_to_str, deleteDeviceStatement, deleteFirewallRules, getTrashBinIcon, deleteConnection, getDeleteTarget, setDeleteTarget, getUser, User, FileObject, Flavor, getAllowedFlavors, Image, getAllowedImages, Firewall_rule, getDevice, getDeviceIDs, getSelected, subscribeToSelectedEntry, getNetworkConnected } from './globals';

export function Configurator() {
  const [odd_render,rerender] = useState<boolean>(false);
  const [odd_render2,rerender2] = useState(false);
  const [netIp, setNetIp] = useState<string>("");
  const [netBrd, setNetBrd] = useState<string>("");
  const [is_accessible, setIsAccessible] = useState<boolean>(true);
  const [connected, setConnected] = useState<number[]>([]);
  const [specified, setSpecified] = useState<string[]>([]);
  const [firewall_rules, setFirewallRules] = useState<Firewall_rule[]>([])
  const [image, setImage] = useState<string>("");
  const [is_router, setIsRouter] = useState<boolean>(false);
  const [flavor, setFlavor] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [softwares, setSoftwares] = useState<string[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<string[]>([]);
  const [file_objects, setFileObjects] = useState<FileObject[]>([]);
  const TAref = useRef<HTMLTextAreaElement>(null);

  useEffect(()=>{
    const unsubscribe = subscribeToSelectedEntry(rerender);
    return unsubscribe;
  }, []);

  useEffect(()=>{
    updateVars();
    console.log(`changed selected odd_render:(${odd_render})`);
  }, [odd_render])

  const handleChange_NetIp = (e: React.ChangeEvent<HTMLInputElement>)=>{
    setNetIp(e.target.value);
    const net : any = getSelected();
    if(net!==null){
      net.ip=e.target.value;
    }
  }

  const handleChange_NetBrd = (e: React.ChangeEvent<HTMLInputElement>)=>{
    setNetBrd(e.target.value);
    const net : any = getSelected();
    if(net!==null){
      net.brd=e.target.value;
    }
  }

  const handleChange_Accessible = (e: React.ChangeEvent<HTMLInputElement>)=>{
    setIsAccessible(!is_accessible);
    const net : any = getSelected();
    if(net!==null){
      net.accessible=e.target.checked;
    }
  }

  const addConnection = () => {
    console.log(`adding new connection`);
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    const deviceIDs = getDeviceIDs();
    if(deviceIDs.length==0){
      console.log(`failed, no devices`);
      return;
    }

    if(!("connected" in selected)){
      console.log(`creating connected property for selected network`);
      selected.connected=[]
    }
    const used = selected.connected;

    const unused = deviceIDs.filter(
      (item) => !used.includes(item)
    );

    if(unused.length==0){
      console.log(`failed, no unused devices`);
      return;
    }
    let chosen = unused[0];
    console.log(`chosen the device ${chosen}`);

    setConnected([...connected,chosen,])
    setSpecified([...specified,"",])

    selected.connected.push(chosen)
    selected.specified.push("")
  }

  const handleChange_Connected = (e: React.ChangeEvent<HTMLSelectElement>, previous: number) =>{
    const selected_device : number = Number(e.target.value);

    if(connected.includes(selected_device)){
      return;
    }

    setConnected((old) => 
      old.map((num) =>
        num === previous ? selected_device : num
      )
    );
    
    const dev : any = getSelected();
    if(dev!==null){
      dev.connected = dev.connected.map((num : number) =>
        num === previous ? selected_device : num
      )
    }

    return;
  }

  const handleChange_Specified = (e: React.ChangeEvent<HTMLInputElement>, ind: number) =>{
    const new_ip : string = e.target.value;

    setSpecified((old) => 
      old.map((ip, index) =>
        index === ind ? new_ip : ip
      )
    );

    const dev : any = getSelected();
    if(dev!==null){
      dev.specified = dev.specified.map((ip:string, index:number) =>
        index === ind ? new_ip : ip
      )
    }

    return
  }

  const addFirewallRule = () => {
    console.log(`adding new firewall rule`);
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    const new_rule: Firewall_rule = {rule:"blocks",addressType:"port",operand1:"",operand2:""};
    setFirewallRules([...firewall_rules,new_rule,])
    selected.firewallRules.push(new_rule);
  }

  const handleChange_FirewallRule = (e: React.ChangeEvent<HTMLSelectElement>|React.ChangeEvent<HTMLInputElement>, changed_rule: Firewall_rule, rule_index: number, field: string) => {
    if(field=="rule"){
      changed_rule.rule=e.target.value;
    }
    else if(field=="addressType"){
      changed_rule.addressType=e.target.value;
    }
    else if(field=="operand1"){
      changed_rule.operand1=e.target.value;
    }
    else if(field=="operand2"){
      changed_rule.operand2=e.target.value;
    }
    else{
      console.log(`unknown field of firewall rules ${field}`);
      return;
    }

    setFirewallRules(
      firewall_rules.map((old_rule : Firewall_rule, index: number) => 
        index === rule_index ? changed_rule : old_rule
      )
    );

    return;
  }

  const handleChange_Image = (e: React.ChangeEvent<HTMLSelectElement>)=>{
    setImage(e.target.value);
    const dev : any = getSelected();
    if(dev!==null){
      dev.image=e.target.value;
    }
  }
  
  const handleChange_Router = (e: React.ChangeEvent<HTMLSelectElement>)=>{
    setIsRouter(e.target.value=="router");
    const dev : any = getSelected();
    if(dev!==null){
      dev.isRouter=e.target.value=="router";
    }
  }

  const handleChange_Flavor = (e: React.ChangeEvent<HTMLSelectElement>)=>{
    setFlavor(e.target.value);
    const dev : any = getSelected();
    if(dev!==null){
      dev.flavor=e.target.value;
    }
  }

  const addUser = () => {
    console.log(`adding new user`);

    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    //selecting new unique name
    let user_name = "user";
    let tmp_num = 0;
    while(selected.users.some((user:User) => user.name === user_name)){
        tmp_num+=1;
        user_name = "user_"+String(tmp_num);
    }

    let new_user : User = {name:user_name, password:"", isAdmin:false};
    setUsers([...users,new_user,])
    selected.users.push(new_user)
  }

  const handleChange_User = (e: React.ChangeEvent<HTMLInputElement>, changed_user: User, user_index: number, field: string) => {
    if(field=="name"){
      changed_user.name=e.target.value;
    }
    else if(field=="password"){
      changed_user.password=e.target.value;
    }
    else if(field=="isAdmin"){
      changed_user.isAdmin=e.target.checked;
    }
    else{
      console.log(`unknown field of user ${field}`);
      return;
    }

    setUsers(
      users.map((old_user : User, index: number) => 
        index === user_index ? changed_user : old_user
      )
    );

    return;
  }

  const addSoftware = () => {
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    setSoftwares([...softwares,"",])
    selected.softwares.push("")
  }

  const handleChange_Software = (e: React.ChangeEvent<HTMLInputElement>, software_index: number) => {
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    setSoftwares(
      softwares.map((software:string, index: number) => 
        index==software_index ? e.target.value : software
      )
    );

    selected.softwares = selected.softwares.map((software:string, index: number) => 
      index==software_index ? e.target.value : software
    );

    return;
  }

  const addVulnerability = () => {
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    setVulnerabilities([...vulnerabilities,"",])
    selected.vulnerabilities.push("")
  }

  const handleChange_Vulnerability = (e: React.ChangeEvent<HTMLInputElement>, vulnerability_index: number) => {
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    setVulnerabilities(
      vulnerabilities.map((Vulnerabilitie:string, index: number) => 
        index==vulnerability_index ? e.target.value : Vulnerabilitie
      )
    );

    selected.vulnerabilities = selected.vulnerabilities.map((vulnerabilities:string, index: number) => 
      index==vulnerability_index ? e.target.value : vulnerabilities
    );

    return;
  }

  const addFileObject = () => {
    console.log(`adding new file object`);

    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    let new_file_object : FileObject = {filepath:"",owner:null,isDirectory:true,
      acl_R:[],acl_W:[],acl_E:[],acl_NR:[],acl_NW:[],acl_NE:[]};

    setFileObjects([...file_objects,new_file_object,])
    selected.fileObjects.push(new_file_object)
  }
  
  const handleChange_FileObject = (e: React.ChangeEvent<HTMLSelectElement>|React.ChangeEvent<HTMLInputElement>, changed_FO: FileObject, FO_index: number, field: string) => {
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    if(field=="filepath"){
      changed_FO.filepath=e.target.value;
    }
    else if(field=="owner"){
      const new_owner : User|null = getUser(selected, e.target.value);
      if(new_owner===null){
        return
      }

      changed_FO.owner=new_owner;
    }
    else if(field=="isDirectory"){
      changed_FO.isDirectory= e.target.value==="folder";
    }
    else{
      console.log(`unknown field of file object ${field}`);
      return;
    }

    setFileObjects(
      file_objects.map((old_FO : FileObject, index: number) => 
        index === FO_index ? changed_FO : old_FO
      )
    );

    return;
  }

  const handleChange_FileObjectACL = (e: React.ChangeEvent<HTMLSelectElement>, changed_FO: FileObject, FO_index: number, operation: string) => {
    console.log(`changed permission on FO ${changed_FO.filepath}`);

    const selected : any = getSelected();
    if(selected===null){
      return;
    }
    const chosen_user : User|null = getUser(selected, e.target.value);
    if(chosen_user===null){
      return
    }

    let Permitted_users: User[]=[];
    let Restricted_users: User[]=[]; 
    if(operation=="read"){
      Permitted_users = changed_FO.acl_R;
      Restricted_users = changed_FO.acl_NR;
    }
    else if(operation=="write"){
      Permitted_users = changed_FO.acl_W;
      Restricted_users = changed_FO.acl_NW;
    }
    else if(operation=="execute"){
      Permitted_users = changed_FO.acl_E;
      Restricted_users = changed_FO.acl_NE;
    }
    else{
      console.log(`unknown permission type of file object ${operation}`);
      return;
    }

    let permission_status: string = "unknown";
    if(Permitted_users.includes(chosen_user)){

      const user_index = Permitted_users.indexOf(chosen_user);
      if(user_index!=-1){
        Permitted_users.splice(user_index, 1);
      }

      Restricted_users.push(chosen_user);
      permission_status="forbidden";
    }
    else if(Restricted_users.includes(chosen_user)){
      
      const user_index = Restricted_users.indexOf(chosen_user);
      if(user_index!=-1){
        Restricted_users.splice(user_index, 1);
      }

      permission_status="default";
    }
    else{
      Permitted_users.push(chosen_user);
      permission_status="allowed";
    }

    setFileObjects(
      file_objects.map((old_FO : FileObject, index: number) => 
        index === FO_index ? changed_FO : old_FO
      )
    );

    console.log(`permission of ${chosen_user.name} to ${changed_FO.filepath} : ${operation} is ${permission_status}`);
    return
  }

  const updateVars = ()=>{
    const selected : any = getSelected();
    if(selected!==null){
      if(selected.isNetwork){
        setNetIp(selected.ip);
        setNetBrd(selected.brd);
        setIsAccessible(selected.accessible);
        setConnected(selected.connected);
        setSpecified(selected.specified);
        setFirewallRules(selected.firewallRules)
      }
      else{
        setImage(selected.image);
        setIsRouter(selected.isRouter);
        setFlavor(selected.flavor);
        setUsers(selected.users);
        setSoftwares(selected.softwares);
        setVulnerabilities(selected.vulnerabilities);
        setFileObjects(selected.fileObjects);
      }
    }
  }

  useEffect(()=>{
    const newEntry = TAref.current;
    if(newEntry!==null){
      newEntry.focus();
      newEntry.setSelectionRange(0,newEntry.value.length);
      console.log(`auto focus on ${newEntry.value}`);
    }
  },[odd_render])

  const allowConnectionDeletion = () => {
    setDeleteTarget("connections");
    rerender2(!odd_render2);
  }

  const deleteConnectionLocally = (index:number)=>{
    
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    deleteConnection(selected, connected[index]);
    updateVars();
    rerender2(!odd_render2);
  }

  const allowFirewallRuleDeletion = () => {
    setDeleteTarget("firewall_rules");
    rerender2(!odd_render2);
  }

  const deleteFirewallRuleLocally = (index:number)=>{
    
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    deleteFirewallRules(selected, index);
    updateVars();
    rerender2(!odd_render2);
  }

  const allowDeviceStatementDeletion = (field:string) => {
    if(field != "users" && field != "softwares" && field != "vulnerabilities" && field != "file_objects"){
      console.log(`unknown device statement type ${field}`);
      return;
    }

    setDeleteTarget(field);
    rerender2(!odd_render2);
  }

  const deleteDeviceStatementLocally = (field:string, index:number)=>{
    if(field != "users" && field != "softwares" && field != "vulnerabilities" && field != "file_objects"){
      console.log(`unknown device statement type ${field}`);
      return;
    }
    
    const selected : any = getSelected();
    if(selected===null){
      return;
    }

    deleteDeviceStatement(selected, field, index);
    updateVars();
    rerender2(!odd_render2);
  }

  return (
    
    <div className='ConfiguratorContainer'>
        <div className = 'ConfName'>
          <h1 className='ConfiguratorText'>{getSelected()?.name}</h1>
        </div>

        {(()=>{
          if(getSelected()?.isNetwork){
            return(
            
              <div className = 'ConfProperties'>
                <div className = 'ConfiguratorContainer2'>
                  <p className='NoVertMargin'>ip range:</p>
                  <input
                    type="text"
                    value={netIp}
                    onChange={handleChange_NetIp}
                    placeholder="network id"
                  />
                  <p className='NoVertMargin'> to </p>
                  <input
                    type="text"
                    value={netBrd}
                    onChange={handleChange_NetBrd}
                    placeholder="broadcast"
                  />

                <p className='NoVertMargin'>is user accessible:</p>
                 <input
                    type="checkbox"
                    checked={is_accessible}
                    onChange={handleChange_Accessible}
                  />
                </div>

                <div className = 'ConfList'>
                  <div className="ExplorerList">
                    <div className="ExplorerHeader">
                      connected devices:

                      <div className='HorizontalFlexCompact'>
                        <button onClick={addConnection} className="ExplorerHeaderButton">
                          +
                        </button>
                        <button onClick={allowConnectionDeletion} className="ExplorerHeaderButton">
                          {getTrashBinIcon(getDeleteTarget()=="connections")}
                        </button>
                      </div>
                    </div>

                    <div className="Scrollable">
                      {
                        connected?.map((num, index) => (
                          getDevice(num) !== null ? (
                            <div className={(index%2==0)?"HorizontalFlexCompact Entry OddEntry":"HorizontalFlexCompact Entry"} key={index}>
                              {(()=>{
                                  if(getDeleteTarget()=="connections"){
                                    return (
                                      <button onClick={(e)=>deleteConnectionLocally(index)} className="ExplorerHeaderButton">
                                        {getTrashBinIcon(getDeleteTarget()=="connections")}
                                      </button>
                                    )
                                  }
                                })()
                              }

                              <div className={(index%2==0)?"Entry OddEntry":"Entry"}>

                                <select
                                  value={num}
                                  onChange={(e) => handleChange_Connected(e, num)}
                                  className="semiTransparent"
                                >

                                  {getDeviceIDs()?.map((num2, index2) => (
                                    (getDevice(num2) !== null && 
                                    (!connected.includes(num2) || num2===num)) ? (
                                      <option
                                        key={index2}
                                        value={num2}
                                        className="whiteBG"
                                      >
                                        {getDevice(num2)!.name}
                                      </option>
                                    ): null
                                  ))}

                                </select>

                                <input
                                  type="text"
                                  value= {specified[index]}
                                  onChange={(e) => handleChange_Specified(e, index)}
                                  placeholder="device ip"
                                />
                              </div>
                            </div>


                          ) : null
                        ))
                      }
                    </div>

                  </div>
                </div>

                <div className = 'ConfList'>
                  <div className="ExplorerList">
                    <div className="ExplorerHeader">
                      firewall rules:

                      <div className='HorizontalFlexCompact'>
                        <button onClick={addFirewallRule} className="ExplorerHeaderButton">
                          +
                        </button>
                        <button onClick={allowFirewallRuleDeletion} className="ExplorerHeaderButton">
                          {getTrashBinIcon(getDeleteTarget()=="firewall_rules")}
                        </button>
                      </div>
                      
                    </div>

                    <div className="Scrollable">
                      {
                        firewall_rules.map((rule, index) => (
                          <div className={(index%2==0)?"HorizontalFlexCompact Entry OddEntry":"HorizontalFlexCompact Entry"} key={index}>
                            {(()=>{
                                if(getDeleteTarget()=="firewall_rules"){
                                  return (
                                    <button onClick={(e)=>deleteFirewallRuleLocally(index)} className="ExplorerHeaderButton">
                                      {getTrashBinIcon(getDeleteTarget()=="firewall_rules")}
                                    </button>
                                  )
                                }
                              })()
                            }

                            <div className={(index%2==0)?"Entry OddEntry":"Entry"}>
                            
                              <div className='HorizontalFlexCompact'>
                                <select
                                  value={rule.rule}
                                  onChange={(e) => handleChange_FirewallRule(e, rule, index, "rule")}
                                  className="semiTransparent"
                                >
                                  <option value="blocks" className="whiteBG">
                                    block
                                  </option>
                                  
                                  <option value="forwards" className="whiteBG">
                                    forward
                                  </option>
                                </select>

                                <select
                                  value={rule.addressType}
                                  onChange={(e) => handleChange_FirewallRule(e, rule, index, "addressType")}
                                  className="semiTransparent"
                                >
                                  <option value="ip" className="whiteBG">
                                    ip
                                  </option>
                                  
                                  <option value="port" className="whiteBG">
                                    port
                                  </option>
                                </select>
                              </div>

                              {
                                (rule.rule == "blocks")
                                ? 
                                (
                                  <div className='HorizontalFlex'>
                                    <p className='NoVertMargin'> on </p>
                                    <input
                                      type="text"
                                      value= {rule.operand1}
                                      onChange={(e) => handleChange_FirewallRule(e, rule, index, "operand1")}
                                      placeholder={rule.addressType=="ip"?"blocked IP":"blocked port"}
                                    />
                                  </div>
                                )
                                :
                                (
                                  <div className='HorizontalFlex'>
                                    <p className='NoVertMargin'> from </p>
                                    <input
                                      type="text"
                                      value= {rule.operand1}
                                      onChange={(e) => handleChange_FirewallRule(e, rule, index, "operand1")}
                                      placeholder={rule.addressType=="ip"?"original address":"original port"}
                                    />
                                    <p className='NoVertMargin'> to </p>
                                    <input
                                      type="text"
                                      value= {rule.operand2}
                                      onChange={(e) => handleChange_FirewallRule(e, rule, index, "operand2")}
                                      placeholder={rule.addressType=="ip"?"redirected address":"redirected port"}
                                    />
                                  </div>
                                )
                              }
                            </div>

                          </div>
                        ))
                      }
                    </div>

                  </div>
                </div>

              </div>)
          }
          else if(getSelected()!==null){
            return (

              <div className = 'ConfProperties'>

                <div className = 'ConfiguratorContainer2'>
                  <p className='NoVertMargin'>image:</p>
                  <select
                    value={image}
                    onChange={handleChange_Image}
                    className="semiTransparent"
                  >

                    {getAllowedImages().map((image:Image, index)=>
                      <option
                        key={index}
                        value={image.image}
                        className='whiteBG'
                      >
                        {image.image} | OS: {image.OS}
                      </option>
                    )}

                  </select>

                  <p className='NoVertMargin'> </p>
                  <select
                    value={is_router?"router":"device"}
                    onChange={handleChange_Router}
                    className="semiTransparent"
                  >
                    <option value={"router"} className='whiteBG'>router</option>
                    <option value={"device"} className='whiteBG'>device</option>

                  </select>
                </div>

                <div className = 'ConfiguratorContainer2'>
                  <p className='NoVertMargin'>flavor:</p>
                  <select
                    value={flavor}
                    onChange={handleChange_Flavor}
                    className="semiTransparent"
                  >

                    {getAllowedFlavors().map((flavor:Flavor, index)=>
                      <option
                        key={index}
                        value={flavor.flavor}
                        className='whiteBG'
                      >
                        {flavor.flavor} | vCPU: {flavor.vCPU ?? "unknown"} | RAM: {(flavor.RAM!==null) ? memsize_to_str(flavor.RAM) : "unknown"} | disk: {(flavor.disk!==null) ? memsize_to_str(flavor.disk) : "unknown"}
                      </option>
                    )}

                  </select>
                </div>

                
                <div className = 'ConfList'>
                  <div className='HorizontalFlex vert100'>
                    
                    <div className='hideYoverflow'>
                      <div className="ExplorerList">
                        <div className="ExplorerHeader">
                          users:
                          
                          <div className='HorizontalFlexCompact'>
                            <button onClick={addUser} className="ExplorerHeaderButton">
                              +
                            </button>
                            <button onClick={(e)=>allowDeviceStatementDeletion("users")} className="ExplorerHeaderButton">
                              {getTrashBinIcon(getDeleteTarget()=="users")}
                            </button>
                          </div>
                        </div>

                        <div className="Scrollable">
                          {
                            users?.map((user, index) => (
                              <div className={(index%2==0)?"HorizontalFlexCompact Entry OddEntry":"HorizontalFlexCompact Entry"} key={index}>
                                {(()=>{
                                    if(getDeleteTarget()=="users"){
                                      return (
                                        <button onClick={(e)=>deleteDeviceStatementLocally("users", index)} className="ExplorerHeaderButton">
                                          {getTrashBinIcon(getDeleteTarget()=="users")}
                                        </button>
                                      )
                                    }
                                  })()
                                }

                                <div className={(index%2==0)?"horz100 Entry OddEntry HorizontalFlex":"horz100 Entry HorizontalFlex"}>

                                  <input
                                    type="text"
                                    value={user.name}
                                    onChange={(e) => handleChange_User(e,user, index, "name")}
                                    placeholder="user name"
                                    className = "minwidth0"
                                  />
                                  <input
                                    type="text"
                                    value={user.password}
                                    onChange={(e) => handleChange_User(e,user, index, "password")}
                                    placeholder="password"
                                    className = "minwidth0"
                                  />
                                  <p className='NoVertMargin noTextWrap'> admin: 
                                    <input
                                      type="checkbox"
                                      checked={user.isAdmin}
                                      onChange={(e) => handleChange_User(e,user, index, "isAdmin")}
                                    />
                                  </p>
                                </div>
                              </div>
                                
                            ))
                          }
                        </div>

                      </div>
                    </div>
                  
                    <div className='hideYoverflow'>
                      <div className="ExplorerList">
                        <div className="ExplorerHeader">
                          softwares:

                          <div className='HorizontalFlexCompact'>
                            <button onClick={addSoftware} className="ExplorerHeaderButton">
                              +
                            </button>
                            <button onClick={(e)=>allowDeviceStatementDeletion("softwares")} className="ExplorerHeaderButton">
                              {getTrashBinIcon(getDeleteTarget()=="softwares")}
                            </button>
                          </div>
                        </div>

                        <div className="Scrollable">
                          {
                            softwares?.map((software, index) => (
                               <div className={(index%2==0)?"HorizontalFlexCompact Entry OddEntry":"HorizontalFlexCompact Entry"} key={index}>
                                {(()=>{
                                    if(getDeleteTarget()=="softwares"){
                                      return (
                                        <button onClick={(e)=>deleteDeviceStatementLocally("softwares", index)} className="ExplorerHeaderButton">
                                          {getTrashBinIcon(getDeleteTarget()=="softwares")}
                                        </button>
                                      )
                                    }
                                  })()
                                }

                                <div className={(index%2==0)?"horz100 Entry OddEntry HorizontalFlex":"horz100 Entry HorizontalFlex"}>
                                  <input
                                    type="text"
                                    value= {software}
                                    onChange={(e) => handleChange_Software(e, index)}
                                    placeholder="software product name"
                                    className='horz100'
                                  />
                                </div>
                              </div>
                            ))
                          }
                        </div>

                      </div>
                    </div>

                    <div className='hideYoverflow'>
                      <div className="ExplorerList">
                        <div className="ExplorerHeader">
                          vulnerabilities:

                          <div className='HorizontalFlexCompact'>
                            <button onClick={addVulnerability} className="ExplorerHeaderButton">
                              +
                            </button>
                            <button onClick={(e)=>allowDeviceStatementDeletion("vulnerabilities")} className="ExplorerHeaderButton">
                              {getTrashBinIcon(getDeleteTarget()=="vulnerabilities")}
                            </button>
                          </div>
                        </div>

                        <div className="Scrollable">
                          {
                            vulnerabilities?.map((vulnerability, index) => (
                               <div className={(index%2==0)?"HorizontalFlexCompact Entry OddEntry":"HorizontalFlexCompact Entry"} key={index}>
                                {(()=>{
                                    if(getDeleteTarget()=="vulnerabilities"){
                                      return (
                                        <button onClick={(e)=>deleteDeviceStatementLocally("vulnerabilities", index)} className="ExplorerHeaderButton">
                                          {getTrashBinIcon(getDeleteTarget()=="vulnerabilities")}
                                        </button>
                                      )
                                    }
                                  })()
                                }

                                <div className={(index%2==0)?"horz100 Entry OddEntry HorizontalFlex":"horz100 Entry HorizontalFlex"}>
                                  <input
                                    type="text"
                                    value= {vulnerability}
                                    onChange={(e) => handleChange_Vulnerability(e, index)}
                                    placeholder="CVE-XXXX-XXXX"
                                    className='horz100'
                                  />
                                </div>
                              </div>
                            ))
                          }
                        </div>

                      </div>
                    </div>


                  </div>
                </div>


                <div className = 'ConfList'>
                  <div className="ExplorerList">
                    <div className="ExplorerHeader">
                      directories and files:
                      
                      <div className='HorizontalFlexCompact'>
                        <button onClick={addFileObject} className="ExplorerHeaderButton">
                          +
                        </button>
                        <button onClick={(e)=>allowDeviceStatementDeletion("file_objects")} className="ExplorerHeaderButton">
                          {getTrashBinIcon(getDeleteTarget()=="file_objects")}
                        </button>
                      </div>
                    </div>

                    <div className="Scrollable">
                      {
                        file_objects.map((file_object, index) => (
                          <div className={(index%2==0)?"HorizontalFlexCompact Entry OddEntry":"HorizontalFlexCompact Entry"} key={index}>
                            {(()=>{
                                if(getDeleteTarget()=="file_objects"){
                                  return (
                                    <button onClick={(e)=>deleteDeviceStatementLocally("file_objects", index)} className="ExplorerHeaderButton">
                                      {getTrashBinIcon(getDeleteTarget()=="file_objects")}
                                    </button>
                                  )
                                }
                              })()
                            }

                            <div className={(index%2==0)?"Entry OddEntry":"Entry"}>

                              {/*filepath*/}
                              <input
                                type="text"
                                value= {file_object.filepath}
                                onChange={(e) => handleChange_FileObject(e, file_object, index, "filepath")}
                                placeholder="filepath"
                              />

                              {/*owner*/}
                              <select
                                value={file_object.owner!=null ? file_object.owner?.name : "root"}
                                onChange={(e) => handleChange_FileObject(e, file_object, index, "owner")}
                                className="semiTransparent"
                              >
                                {users.map((user:User, index)=>
                                  <option
                                    key={index}
                                    value={user.name}
                                    className='whiteBG'
                                  >
                                    {user.name}
                                  </option>
                                )}
                                <option value="root" className='whiteBG'>root</option>

                              </select>

                              {/*file or folder*/}
                              <select
                                value={file_object.isDirectory ? "folder" : "file"}
                                onChange={(e) => handleChange_FileObject(e, file_object, index, "isDirectory")}
                                className="semiTransparent"
                              >
                                <option value="folder" className='whiteBG'>folder</option>
                                <option value="file" className='whiteBG'>file</option>

                              </select>

                              
                              {/*ACL permissions*/}
                              <div className='HorizontalFlex'>
                                <p className='NoVertMargin'> permissions: </p>

                                {/*READ*/}
                                <select
                                  value=""
                                  onChange={(e)=>handleChange_FileObjectACL(e,file_object, index, "read")}
                                  className="semiTransparent"
                                >
                                  <option value="" className='whiteBG'>read</option>
                                  {users.map((user:User, index)=>
                                    <option
                                      key={index}
                                      value={user.name}
                                      className={ file_object.acl_R.includes(user) ? 'whiteBG greenColor' :  (file_object.acl_NR.includes(user) ? 'whiteBG redColor' :'whiteBG')}
                                    >
                                      {user.name}
                                    </option>
                                  )}

                                </select>

                              {/*WRITE*/}
                                <select
                                  value=""
                                  onChange={(e)=>handleChange_FileObjectACL(e,file_object, index, "write")}
                                  className="semiTransparent"
                                >
                                  <option value="" className='whiteBG'>write</option>
                                  {users.map((user:User, index)=>
                                    <option
                                      key={index}
                                      value={user.name}
                                      className={ file_object.acl_W.includes(user) ? 'whiteBG greenColor' :  (file_object.acl_NW.includes(user) ? 'whiteBG redColor' :'whiteBG')}
                                    >
                                      {user.name}
                                    </option>
                                  )}

                                </select>

                              {/*EXECUTE*/}
                                <select
                                  value=""
                                  onChange={(e)=>handleChange_FileObjectACL(e,file_object, index, "execute")}
                                  className="semiTransparent"
                                >
                                  <option value="" className='whiteBG'>execute</option>
                                  {users.map((user:User, index)=>
                                    <option
                                      key={index}
                                      value={user.name}
                                      className={ file_object.acl_E.includes(user) ? 'whiteBG greenColor' :  (file_object.acl_NE.includes(user) ? 'whiteBG redColor' :'whiteBG')}
                                    >
                                      {user.name}
                                    </option>
                                  )}

                                </select>

                              </div>
                            </div>

                          </div>
                        ))
                      }
                    </div>

                  </div>
                </div>

              </div>
            )
          }
        })()}
    </div>
  );
}