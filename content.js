const island = document.createElement('div');
const upBtn = document.createElement('button');
const downBtn = document.createElement('button');
const createMarkBtn = document.createElement('button');

upBtn.textContent = "Up";
downBtn.textContent = "Down";
createMarkBtn.textContent = "Create";

island.classList.add('island');
upBtn.classList.add('up-btn');
downBtn.classList.add('down-btn');
createMarkBtn.classList.add('create-mark');

island.appendChild(createMarkBtn);
island.appendChild(upBtn);
island.appendChild(downBtn);

document.body.appendChild(island);


function attachMarkToScroll(){
    
}