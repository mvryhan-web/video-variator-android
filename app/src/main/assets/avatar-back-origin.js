/* Only the explicitly identified local Tools entry changes Avatar Back.
   Keep the original index.html default for Video Uniquifier and direct opens. */
(() => {
 'use strict';
 const back=document.querySelector('a.tool-back[data-av="back"]');
 if(back&&new URLSearchParams(location.search).get('from')==='tools'){
  back.href='free-tools.html';
 }
})();
