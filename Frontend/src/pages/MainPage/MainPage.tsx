import { Header } from "../../global_components/Header/Header";
import CartSheet from "../../global_components/Header/Cart/CartSheet";
import { useEffect, useState } from "preact/hooks";
import { Footer } from "../../global_components/Footer/Footer";
import "./MainPage.css"
import { Link } from "react-router-dom";
import { Arrow } from "../ProductPreviewPage/ProductPreview";
import { useRef } from "react"
import flowers1 from "../../assets/flowers1.png"

export const MainPage: React.FC = () => {
  const [cartSheetVisible, setCartSheetVisible] = useState(false)
  return (
    <>
      <Header setShowCartSheet={setCartSheetVisible} />
      <CartSheet show={cartSheetVisible} setShow={setCartSheetVisible} />
      <div class={"page-content"} style={{ direction: "rtl" }}>
        <div className={"main-page"}>
          <div style={{ fontSize: "1.6em", padding: "5rem 12vw 0 0", fontWeight: "550" }}>
            לב התחביב
            <div style={{ fontSize: "0.8em", margin: "0 0 0 0" }}>מקום חביב לחובבי יצירה ואומנות...
              ולכולם !</div>
          </div>
          <Section1 />
          <LocationDisplay />
          <Bubble title="צבעים כמו חול אולי נצייר ארמון כחול?" link="/" linkTitle="צבעים בשפע כאן" />
          <Bubble title="כן? כן...? לסטודיו או סתם לחדר" link="/" linkTitle="כני ציור ועוד..." />
        </div>
      </div>
      <Footer />
    </>
  );
};

const LocationDisplay: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onScroll = (e: Event) => {
      if (ref.current) {
        let bounds = ref.current.getBoundingClientRect()
        console.log(`top: ${bounds.top}`)
        console.log(`dy: ${bounds.top / window.innerHeight}`)
        ref.current.style.borderRadius = `${Math.min(4, Math.max(0, 4*(bounds.top / (window.innerHeight / 4) - 1)))}em`
        ref.current.style.opacity = `${(bounds.top + bounds.height * 3/4) / (window.innerHeight)}`
      }
    }
    document.body.addEventListener("scroll", onScroll)
    return () => {
      document.body.removeEventListener("scroll", onScroll)
    }
  })

  return <div ref={ref} class="location-display"></div>
}

const Section1:React.FC = ()=>{
  return <div style="margin-top: 10em; position: relative; width: 40vw; margin: 0 auto 0 0; min-height: 50vh; background: #FFF7F0; border-radius: 2vw">
    <Circle r={"15vw"} fill={"#A9375A"} className="float" style={"position: absolute; left: -2em; top: 2em;"}/>
    <img src={flowers1} class={"float3"} alt="" style={"position: absolute; left: 5vw; top: -5vw; width: 25vw"} />
    <Circle r={"25vw"} fill={"#A9375A"} className="float2" style={"position: absolute; left: 0; top: 5em "}/>
  </div> 
}

const Circle:React.FC<{r: string, fill?: string, className?: string, style?:string}> = ({style, r, fill, className})=>{
  return <svg viewBox={"0 0 100 100"} className={className} style={`width: ${r}; height: ${r}; ${style ?? ""}`}>
    <circle cx="50" cy="50" r="50" fill={fill ?? ""}></circle>
  </svg>
}


const Bubble: React.FC<{ title: string, linkTitle: string, link: string }> = ({ title, linkTitle, link }) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onScroll = (e: Event) => {
      if (ref.current) {
        let bounds = ref.current.getBoundingClientRect()
        let dy = bounds.height - bounds.top
        ref.current.style.opacity = `${dy * dy / bounds.height}`
      }
    }

    document.body.addEventListener("scroll", onScroll)
    return () => {
      document.body.removeEventListener("scroll", onScroll)
    }
  }, [])


  return <div className={"bubble"} ref={ref}>
    <div className={"bubble-container"}>
      <div>
        <div className={"bubble-content"}>
          <div>
            <div>{title}</div>
            <div className={"bubble-link"}>
              <Link to={link}>
                <span>
                  {linkTitle}
                </span>
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
}
