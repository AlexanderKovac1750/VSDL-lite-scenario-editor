import { useEffect, useRef, useState } from 'react';
import './Editor.css';
import { getTrashBinIcon, deleteNetwork, getDeleteTarget, setDeleteTarget, getNetworkCount, getNetworks, getSelected, Network, newNetwork, selectEntry } from './globals';


export function NetworkExplorer() {
  const [odd_render,rerender] = useState(false);
  const [odd_render2,rerender2] = useState(false);
  const [name, setName] = useState<string|null>(null);
  const TAref = useRef<HTMLTextAreaElement>(null);

  const addNew = () => {
    console.log(`new network added`);
    selectNetwork(newNetwork());
    rerender(!odd_render);
  }

  const selectNetwork = (network: Network) =>{
    console.log(`network ${network.name} clicked`);
    selectEntry(network);
    setName(network.name);
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

  const allowNetworkDeletion = () => {
    setDeleteTarget("networks");
    rerender2(!odd_render2);
  }

  const deleteNetworkLocally = (index:number)=>{
    deleteNetwork(index);
    rerender2(!odd_render2);
  }

  return (

    <div className="ExplorerWindow">
     
      <div className="ExplorerList">
        <div className="ExplorerHeader">
          Networks({getNetworkCount()})

          <div className='HorizontalFlexCompact'>
            <button onClick={addNew} className="ExplorerHeaderButton">
              +
            </button>
            <button onClick={allowNetworkDeletion} className="ExplorerHeaderButton">
              {getTrashBinIcon(getDeleteTarget()=="networks")}
            </button>
          </div>
        </div>

        <div className="Scrollable">
          {
            getNetworks().map((net, index) => (
              <div className={(index%2==0)?"HorizontalFlexCompact Entry OddEntry":"HorizontalFlexCompact Entry"} key={net.id}>
                {(()=>{
                    if(getDeleteTarget()=="networks"){
                      return (
                        <button onClick={(e)=>deleteNetworkLocally(index)} className="ExplorerHeaderButton">
                          {getTrashBinIcon(getDeleteTarget()=="networks")}
                        </button>
                      )
                    }
                  })()
                }

                <div className={(index%2==0)?"Entry OddEntry":"Entry"} onClick={()=>{selectNetwork(net)}}>
                  {(()=>{
                      if(name===null || net!==getSelected()){
                        return <p className='EntryName'>{net.name}</p>;
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