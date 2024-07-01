import "./Accessibility.css"

export const AccessibilityButton:React.FC<{setVisible?: (v: boolean)=> void}> = ({setVisible})=>{
   return <div class="accessibility-button" onClick={()=> {if(setVisible) setVisible(true);}}></div> 
}

export const AccessibilityMenu: React.FC<{visible: boolean, setVisible: (v:boolean)=>void}> = ({visible})=>{
    return <div class="accessibility-menu">
        <div></div>
    </div>
}