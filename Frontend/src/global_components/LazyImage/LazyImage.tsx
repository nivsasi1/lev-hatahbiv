import { useState } from "preact/hooks"
import "./LazyImage.css"

const LazyImage: React.FC<{ src: string, className?: string }> = ({ src, className }) => {
    const [loaded, setLoaded] = useState(false)
    return (<div className={"baka-lazy-image " +(loaded ? "loaded ":"") + (className??"")}>
        <img src={src} onError={(e) =>{ e.currentTarget.style.display = 'none'}} onLoad={(e) => { setLoaded(true)}} />
    </div>)
}

export default LazyImage