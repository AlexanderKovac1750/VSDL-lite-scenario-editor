import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css'
import { pickFileToRead, downloadFile, makeNewFile, openFilePicker ,saveFile} from './filePicker'
import { getV2K, verifyScenario,  resetError, getErrorMessage, uploadEnvConstraints, getEnvConstraints, getFileHandle, getBaseboxLimits, uploadBaseboxLimits, stringifyScenario } from './globals';
import { usePWAInstall } from './installLocallyButton';
import { generateSandbox } from 'Generator';

function Navbar() {
  const [openMenu, setOpenMenu] = useState<string|null>(null);
  const [odd_render, rerender] = useState<boolean>(false);
  const navRef = useRef<HTMLDivElement>(null);
  const { canInstall, install } = usePWAInstall();

  const toggleMenu = (menuName : string) => {
    console.log(`${menuName} menu ${openMenu === menuName ? "closed" : "selected"}`);
    setOpenMenu(openMenu === menuName ? null : menuName);
    
  }

  const PressedMenuItem = (itemName : string) => {
    console.log(`${openMenu}:${itemName} clicked`);
  }

  const GetExpandedMenu = (currentMenu : string, targetMenu : string, items : string[]) => {
    if(currentMenu === targetMenu && openMenu === targetMenu){
      return (
        <div className="dropdown">
          {items.map((item) => (
            <div onClick={() => PressedMenuItem(item)} className="dropdown_item" key={item}>
              {item}
            </div>
          ))}
        </div>
      )
    }
    else{
      return;
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (

    <div className="navigation_bar">
      <div className="invisible_div" ref={navRef}>

        <div className="nav_item">
          <button onClick={() => toggleMenu("File")} className="nav_button">
            File
          </button>

          {openMenu === 'File' && (
            <div className="dropdown">
              <div onClick={() => {
                PressedMenuItem("New");
                makeNewFile();
                toggleMenu("File");
              }} className="dropdown_item">
                New
              </div>
              <div onClick={async () => {
                PressedMenuItem("Open");
                const selectedFiles = openFilePicker({
                  accept: ".vsdl"
                });
                toggleMenu("File");
                await(selectedFiles);
              }} className="dropdown_item">
                Open
              </div>
              <div onClick={async() => {
                PressedMenuItem("Save");
                let awaited = saveFile(getFileHandle());
                toggleMenu("File");
                await awaited;
              }} className="dropdown_item">
                Save
              </div>
              <div onClick={async () => {
                PressedMenuItem("Save as");
                let awaited = saveFile(null);
                toggleMenu("File");
                await awaited;
              }} className="dropdown_item">
                Save as
              </div>
            </div>
          )}
        </div>

        <div className="nav_item">
          <button onClick={() => toggleMenu("Generate")} className="nav_button">
            Generate
          </button>

          {openMenu === 'Generate' && (
            <div className="dropdown">
              <div onClick={() => {
                PressedMenuItem("VL_scenario");
                resetError();

                if(verifyScenario()){
                  downloadFile(stringifyScenario(),"input.vsdl");
                }
                toggleMenu("Generate")
              }} className="dropdown_item">
                Scenario
              </div>
              <div onClick={async () => {
                PressedMenuItem("isd_CSC")
                resetError();

                const CSC_sandbox = await generateSandbox("CSC");
                if(CSC_sandbox!=null){
                  downloadFile(CSC_sandbox,"partial_sandbox_definition_CSC.zip");
                }

                toggleMenu("Generate")
              }} className="dropdown_item">
                CSC sandbox
              </div>
              <div onClick={async () => {
                PressedMenuItem("isd_CRP")
                resetError();

                const CRP_sandbox = await generateSandbox("CRP");
                if(CRP_sandbox!=null){
                  downloadFile(CRP_sandbox,"partial_sandbox_definition_CRP.zip");
                }

                toggleMenu("Generate")
              }} className="dropdown_item">
                CRP sandbox
              </div>
            </div>
          )}
        </div>

        <div className="nav_item">
          <button onClick={() => toggleMenu("Environment")} className="nav_button">
            Environment
          </button>

          {openMenu === 'Environment' && (
            <div className="dropdown">
              <div onClick={() => {
                PressedMenuItem("download_EL");
                downloadFile(getEnvConstraints(),"limits.json");
                toggleMenu("Environment");
              }} className="dropdown_item">
                Get limits
              </div>
              <div onClick={async () => {
                PressedMenuItem("upload_EL")
                resetError();

                const response = pickFileToRead({
                  accept: ".json"
                }).catch(
                  err=>{
                    console.log(`failed to upload environmental limits: ${err}`);
                  }
                );
                const result = await(response);

                if(typeof result !== "object" || result==null){
                  return;
                }
                const file:File=result;
                const response2 = uploadEnvConstraints(file);
                await(response2);
                toggleMenu("Environment");
              }} className="dropdown_item">
                Set limits
              </div>
              <div onClick={() => {
                PressedMenuItem("download_BBs");
                downloadFile(getBaseboxLimits(),"base_boxes.yml");
                toggleMenu("Environment");
              }} className="dropdown_item">
                Get images
              </div>
              <div onClick={async () => {
                PressedMenuItem("upload_BBS");
                resetError();

                const response = pickFileToRead({
                  accept: ".yml"
                }).catch(
                  err=>{
                    console.log(`failed to upload available images: ${err}`);
                  }
                );
                const result = await(response);

                if(typeof result !== "object" || result==null){
                  return;
                }
                const file:File=result;
                const response2 = uploadBaseboxLimits(file);
                await(response2);
                toggleMenu("Environment");
              }} className="dropdown_item">
                Set images
              </div>
            </div>
          )}
        </div>

        <div className="nav_item">
          <button onClick={() => toggleMenu("Download")} className="nav_button">
            Download tools
          </button>

          {openMenu === 'Download' && (
            <div className="dropdown">
              <div onClick={async () => {
                PressedMenuItem("editor");

                if(!canInstall){
                  console.log("local install not supported!");
                  return;
                }

                const installed = install();

                if(!installed){
                  console.log("failed to install locally!")
                }
                else{
                  console.log("successfully installed locally!")
                }
                
                toggleMenu("Download")
              }} className="dropdown_item">
                Editor (this)
              </div>
              <div onClick={async () => {
                PressedMenuItem("V2K");
                const V2K_zip = await getV2K();
                if(V2K_zip!=null){
                  downloadFile(V2K_zip,"VSDL-to-KYPO.zip");
                }
                toggleMenu("Download")
              }} className="dropdown_item">
                Translator
              </div>
            </div>
          )}
        </div>

        {(getErrorMessage()!=null && (odd_render!=!odd_render))
        ?
        <div className='error_div'>
          <div className='HorizontalFlexCompact error_inner_div'>
            <div className='error_message_div'>
              {getErrorMessage()}
            </div>

            <button
              onClick={()=>{resetError();rerender(!odd_render);}}
              className='error_close_button'
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6L18 18" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        :
        null}

        {/*{['File', 'Window', 'Tools', 'Settings', 'Help'].map((menu) => (
          <div className="nav_item" key={menu}>
            <button onClick={() => toggleMenu(menu)} className="nav_button">
              {menu}
            </button>

            {GetExpandedMenu(menu, "File", ["New", "Load", "Save", "Save as"])}
            {GetExpandedMenu(menu, "Window", ["fullscreen", "smth"])}
            {GetExpandedMenu(menu, "Tools", ["node", "network", "cable"])}
            {GetExpandedMenu(menu, "Settings", ["user", "font", "preffernecs"])}
            
          </div>
        ))}}*/}
      </div>
    </div>
  );
}

export default Navbar;