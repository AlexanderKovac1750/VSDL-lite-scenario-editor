import { useEffect, useRef, useState } from 'react';
import './Editor.css';
import { getTrashBinIcon, deleteNode, getDeleteTarget, setDeleteTarget, Device, getDeviceCount, getDevices, getSelected, newDevice, selectEntry } from './globals';

export function NodesExplorer() {
  const [odd_render,rerender] = useState(false);
  const [odd_render2,rerender2] = useState(false);
  const [name, setName] = useState<string|null>(null);
  const TAref = useRef<HTMLTextAreaElement>(null);

  const addNew = () => {
    console.log(`new device added`);
    selectDevice(newDevice());
    rerender(!odd_render);
  }

  const selectDevice = (device: Device) =>{
    console.log(`device ${device.name} clicked`);
    selectEntry(device);
    setName(device.name);
  }

  
  useEffect(()=>{
    const newEntry = TAref.current;
    if(newEntry!==null){
      newEntry.focus();
      newEntry.setSelectionRange(0,newEntry.value.length);
      console.log(`auto focus on ${newEntry.value}`);
    }
  },[odd_render])

  const handleNameChange = (e: React.ChangeEvent<HTMLTextAreaElement>)=>{
    const newName = e.target.value;
    setName(newName);
  
    //renaming globally
    let net = getSelected();
    if(net!==null){
      net.name=newName;
    }
  };
  
  const allowNodeDeletion = () => {
    setDeleteTarget("nodes");
    rerender2(!odd_render2);
  }

  const deleteNodeLocally = (index:number)=>{
    deleteNode(index);
    rerender2(!odd_render2);
  }
  

  return (
    <div className="ExplorerWindow ExplorerWindow_rest">
      <div className="ExplorerList">
        <div className="ExplorerHeader">
          Devices({getDeviceCount()})

          <div className='HorizontalFlexCompact'>
            <button onClick={addNew} className="ExplorerHeaderButton">
              +
            </button>
            <button onClick={allowNodeDeletion} className="ExplorerHeaderButton">
              {getTrashBinIcon(getDeleteTarget()=="nodes")}
            </button>
          </div>
        </div>

        <div className="Scrollable">
          {
            getDevices().map((dev, index) => (
              <div className={(index%2==0)?"HorizontalFlexCompact Entry OddEntry":"HorizontalFlexCompact Entry"} key={dev.id}>
                {(()=>{
                    if(getDeleteTarget()=="nodes"){
                      return (
                      <button onClick={(e)=>deleteNodeLocally(index)} className="ExplorerHeaderButton">
                        {getTrashBinIcon(getDeleteTarget()=="nodes")}
                      </button>
                      )
                    }
                  })()
                }

                <div className={(index%2==0)?"Entry OddEntry":"Entry"} onClick={()=>{selectDevice(dev)}}>
                  {(()=>{
                    if(name===null || dev!==getSelected()){
                      return <p className='EntryName'>{dev.name}</p>;
                    }

                    return <textarea
                      spellCheck={false}
                      className='EntryName'
                      value={name}
                      onChange={handleNameChange}
                      rows={1}
                      ref={TAref}
                    />
                  })()
                  }
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}