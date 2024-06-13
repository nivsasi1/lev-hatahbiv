import { Header } from "../../global_components/Header/Header";
import CartSheet from "../../global_components/Header/Cart/CartSheet";
import { useEffect, useState } from "preact/hooks";
import { Footer } from "../../global_components/Footer/Footer";
import "./MainPage.css"
import { Link } from "react-router-dom";
import { Arrow } from "../ProductPreviewPage/ProductPreview";
import { useRef } from "react"

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
          <Bubble title="צבעים כמו חול אולי נצייר ארמון כחול?" link="/" linkTitle="צבעים בשפע כאן" />
          <Bubble title="כן? כן...? לסטודיו או סתם לחדר" link="/" linkTitle="כני ציור ועוד..." />
        </div>
      </div>
      <Footer />
    </>
  );
};


const Bubble: React.FC<{ title: string, linkTitle: string, link: string }> = ({ title, linkTitle, link }) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onScroll = (e: Event) => {
      if(ref.current){
        let bounds = ref.current.getBoundingClientRect()
        console.log(`top: ${bounds.top}`)
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
