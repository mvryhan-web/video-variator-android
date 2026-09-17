(() => {
  const folderBtn=document.getElementById('folderBtn');
  const fileSummary=document.getElementById('fileSummary');
  const ui=()=>window.VideoVariatorUI;

  const webFolderInput=document.createElement('input');
  webFolderInput.type='file';webFolderInput.multiple=true;webFolderInput.setAttribute('webkitdirectory','');webFolderInput.setAttribute('directory','');webFolderInput.accept='video/*';webFolderInput.hidden=true;document.body.appendChild(webFolderInput);

  folderBtn?.addEventListener('click',()=>{
    if(window.AndroidBridge?.pickFolder){window.AndroidBridge.pickFolder();return;}
    webFolderInput.click();
  });

  webFolderInput.addEventListener('change',()=>{
    const files=Array.from(webFolderInput.files||[]).filter(f=>f.type?.startsWith('video/')||/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name));
    ui()?.setFiles(files);
  });

  window.receiveNativeFolderFiles=async(items)=>{
    try{
      folderBtn.disabled=true;fileSummary.textContent=`Loading ${items.length} video file${items.length===1?'':'s'}…`;
      const files=[];
      for(const item of items){
        const response=await fetch(item.url);if(!response.ok)throw new Error(`Could not open ${item.name}`);
        const blob=await response.blob();files.push(new File([blob],item.name,{type:item.type||blob.type||'video/mp4'}));
      }
      ui()?.setFiles(files);
    }catch(e){fileSummary.textContent=e.message;ui()?.toast(e.message);}finally{folderBtn.disabled=false;}
  };
})();
