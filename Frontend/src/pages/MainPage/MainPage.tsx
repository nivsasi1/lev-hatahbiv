import { Header } from "../../global_components/Header/Header";
import CartSheet from "../../global_components/Header/Cart/CartSheet";
import { useEffect, useState } from "preact/hooks";
import { Footer } from "../../global_components/Footer/Footer";
import "./MainPage.css"
import { Link } from "react-router-dom";
import { Arrow } from "../ProductPreviewPage/ProductPreview";
import { useRef } from "react"
import flowers1 from "../../assets/flowers1.png"
import logoPng from "../../assets/logo_black.png"
import flowers from "../../assets/flowers.png"
import heart from "../../assets/heart.png"
import heartIcon from "../../assets/heart_icon.png"
import { Product } from "../../Types/globalTypes";
import testPng from "../../assets/1.png"
import bag from "../../assets/bagv2.svg"
import bit from "../../assets/bit_white.png"
import visa from "../../assets/visa.png"
import mastercard from "../../assets/mastercard.png"
import flowers2 from "../../assets/flowers2.png"
import leaves from "../../assets/leaves.png"
import map from "../../assets/map.png"
import wazeCompact from "../../assets/waze_compact.png"
import searchPng from "../../assets/search.svg";

export const MainPage: React.FC = () => {
  const [cartSheetVisible, setCartSheetVisible] = useState(false)
  return (
    <>
      <Header setShowCartSheet={setCartSheetVisible} />
      <CartSheet show={cartSheetVisible} setShow={setCartSheetVisible} />
      <div class={"page-content"} style={{ direction: "rtl" }}>
        <div className={"main-page"}>
          <MainSection />
          <ProductsSections />
          <CartBanner />
          <LocationSection />
          {/* <div style={{ fontSize: "1.6em", padding: "5rem 12vw 0 0", fontWeight: "550" }}>
            לב התחביב
            <div style={{ fontSize: "0.8em", margin: "0 0 0 0" }}>מקום חביב לחובבי יצירה ואומנות...
              ולכולם !</div>
          </div> */}
          {/* <LocationDisplay /> */}
          {/* <Bubble title="צבעים כמו חול אולי נצייר ארמון כחול?" link="/" linkTitle="צבעים בשפע כאן" />
          <Bubble title="כן? כן...? לסטודיו או סתם לחדר" link="/" linkTitle="כני ציור ועוד..." /> */}
        </div>
      </div>
      <Footer />
    </>
  );
};

const Circle: React.FC<{ r: string, fill?: string, className?: string, style?: string }> = ({ style, r, fill, className }) => {
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

const MainSection: React.FC = () => {
  return <div class={"main-main-sec"}>
    <div class="main-main-sec-back">
      <img src={flowers} alt="" />
      <div id="skew-rect"></div>
      <img id="heart" src={heart} alt="" />
    </div>
    <div class="main-main-sec-content">
      <div>
          {/* <img src={logoPng} alt="" /> */}
      </div>
      <div>
        <span style="font-size: 1.6em">חנות יצירה שיש בה</span><br />
        <span style="font-size: 1.8em">הכל.</span>
      </div>

      <SearchDemo />
      <div class="no-select">
        <span>חנות כלי יצירה לחובבי יצירה ואומנות</span>
        <span>מאז 1985</span>
      </div>
    </div>
    <div></div>
  </div>
}

const SearchDemo = () => {
  const options = [
    {
      'title': 'עפרונות',
      'description': 10,
    },
    {
      'title': 'nigger',
      'description': 1000,
    }
  ]

  const timer = useRef<number | undefined>()
  const [currentOption, setCurrentOption] = useState(0)
  const [currentLength, setCurrentLength] = useState(0)
  const time = useRef<number>(0)

  useEffect(() => {
    timer.current = setInterval(() => {
      setCurrentLength((current) => current + 1)
      time.current += 1
      console.log("CURRENT LENGTH: " + currentLength)
      if (time.current >= 2 * options[currentOption].title.length) {
        time.current = 0
        setCurrentLength(0)
        setCurrentOption((current) => current >= options.length - 1 ? 0 : current + 1)
      }
    }, 200)

    return () => {
      clearInterval(timer.current)
    }
  }, [])

  return <>
    <div class="search-demo-input">
      <img src={searchPng} alt="" />
      <span>{options[currentOption].title.slice(0, currentLength)}</span>
    </div>
    <div class="search-demo-result">{
      time.current - 1 < options[currentOption].title.length
        ?
        <span>מחפש<LoadingSearch /></span>
        :
        <div>
          {options[currentOption].description + (isNumber(options[currentOption].description) ? " תוצאות" : "")}
        </div>
    }

    </div>
  </>
}

const LoadingSearch = () => {
  return <svg viewBox="0 20 100 50" style={"height: 0.75em; margin-right: 0.5em"} class="search-demo-loading">
    <circle cx="20" cy="50" r="7" fill="var(--tint)" style="animation-delay:0"></circle>
    <circle cx="50" cy="50" r="7" fill="var(--tint)" style="animation-delay:0.35s"></circle>
    <circle cx="80" cy="50" r="7" fill="var(--tint)" style="animation-delay:0.6s"></circle>
  </svg>
}

const isNumber = (obj: any) => {
  return typeof obj === 'number'
}

const ProductsSections: React.FC = () => {
  return <div class="main-products-sections">
    <SectionDivider showStarts={true} titles={["המוצרים הנמכרים ביותר בחנות"]} mv={4} />
    <div class="main-products-section">
      <div style="z-index: 1; position: relative">
        <div class="main-products-section-title">המוצרים החביבים עליכם<img src={heartIcon} style="width: 1.5em; height: 1.5em; vertical-align: middle; margin-right: 0.25em;" /></div>
        <div class="main-products-section-content scrollbar-h">
          <ProductPreview product={{ _id: "1", category: "", img: flowers, name: "bababoy", price: 15 }} />
          <ProductPreview product={{ _id: "", category: "", img: flowers, name: "bababoy", price: 15 }} />
          <ProductPreview product={{ _id: "", category: "", img: testPng, name: "bababoy", price: 15, salePercentage: 10 }} />
          <ProductPreview product={{ _id: "", category: "", img: flowers, name: "bababoy", price: 15 }} />
          <ProductPreview product={{ _id: "", category: "", img: flowers, name: "bababoy", price: 15 }} />
        </div>
      </div>
    </div>
    <CategoriesSection />
    <SaleSection />
  </div>
}

const CategoriesSection: React.FC = ()=>{
  return <></>
}

const Stars: React.FC = () => {
  return <svg viewBox="0 0 100 100" class="circle-around" style="width: 1.75em; vertical-align: middle; margin: 0 0.25em 0 0; opacity: 0.9">
    <defs>
      <path id="" fill="var(--tint)" stroke-linejoin={"round"} stroke="var(--tint)" stroke-width={5} d="M85.5 0L105.594 61.843H170.62L118.013 100.064L138.107 161.907L85.5 123.686L32.8932 161.907L52.9872 100.064L0.38044 61.843H65.406L85.5 0Z"></path>
      <path id="star" fill="var(--tint)" stroke-linejoin={"round"} stroke="var(--tint)" stroke-width={5} d="M30,50 Q45,35 50,20 Q55,35 70,50 Q55,65 50,80 Q45,65 30,50"></path>
    </defs>
    <use href="#star" transform="translate(50, 50) scale(0.55)"></use>
    <use href="#star" transform="translate(20,50) scale(0.35)"></use>
    <use href="#star" transform="translate(40,5) scale(0.5)"></use>
  </svg>
}

const SectionDivider: React.FC<{ titles: Array<string>, mv?: number, showStarts?: boolean }> = ({ titles, mv, showStarts }) => {
  return <div class="main-section-divider" style={mv ? `margin: ${mv}rem auto;` : ""}>
    {titles.map((title, index) => <div><span>{title}</span> {index === titles.length - 1 && showStarts && <Stars />}</div>)}
  </div>
}

const SaleSection = () => {
  return (<>
    <SectionDivider titles={["בלב התחביב יש מבצעים שווים!", "שחבל לפספס..."]} />
    <div class="main-sale-section">
      <div class="main-sale-header">
        <div style={"color: #e0e0e0;"}>
          <span style="font-size: 1.2em">חוזרים לקלאס בקלאס</span><br />
          <span style={"opacity: 0.7; font-size: 1em"}>מבצעי חזרה ללימודים</span>
        </div>
        <div style={"font-size: 1.3em; color: var(--varient)"}>עד 50% הנחה</div>
      </div>
      <div class="main-sale-content">
        {/* <svg viewBox="0 0 100 30">
        <path d="M0,20 C20,0 70,20 100,10 L100,100 L0,100 Z" fill="var(--tint-varient)"></path>
      </svg> */}
        <div style="position: relative; z-index: 0">
          <div style="color: var(--tint); font-size: 1.1em; opacity: 0.8; margin: 0.5em 1em">מבצעים שחבל לפספס</div>
          <div style={"display: flex"}>
            <ProductPreview product={{ _id: "", category: "", img: testPng, name: "bababoy", price: 15, salePercentage: 10 }} />
            <ProductPreview product={{ _id: "", category: "", img: testPng, name: "bababoy", price: 15, salePercentage: 10 }} />
          </div>
          <div style="color: var(--tint);  font-size: 1.1em; opacity: 0.5; margin: 0.5em 1em">מוצרים במבצע</div>
        </div>
      </div>
    </div>
  </>)
}

const ProductPreview: React.FC<{ product: Product }> = ({ product }) => {
  return <div class="main-product-preview">
    {product.salePercentage && <div class="main-product-onsale">{product.salePercentage}%</div>}
    <div class="main-product-preview-img"><img src={product.img} alt="" /></div>
    <div>{product.name}</div>
    <div>
      <div style="font-size: 1.1em; line-height: 1.2">
        {product.salePercentage && <div class="main-product-sale-price">
          {product.price}₪
        </div>}
        <div>
          {Math.floor(product.price * (1 - ((product.salePercentage ?? 0) / 100)))}₪
        </div>
      </div>
      <Link to={"/product/" + product._id} class="main-product-pre-button">לצפייה</Link>
    </div>
  </div>
}

const CartBanner: React.FC = () => {
  return <div class="cart-banner">
    <img src={leaves} style={"position: absolute; right: calc(10vw + 25em); bottom: 50%; width: 20em; filter: grayscale(100%) invert(var(--invert)); opacity: 0.1; transform: rotate(-45deg);"} alt="" />
    <div>
      <div style="width: calc(12vw + 26em); text-align: left; font-weight: 600; color: var(--tint)">
        <span style="font-size: 1.4em">
          משלוח עד הבית
        </span>
      </div>
      <div class="cart-banner-content">
        <img src={flowers2} style={"mix-blend-mode: luminosity; opacity: 0.08; border-radius: 1em; width: 100%; height: 100%; object-fit: fill; position: absolute;"} />
        <div>
          <div style="opacity: 0.6; font-size: 1.1em">הסל מוכן?</div>
          <div>למשלמים מעל 300₪</div>
          <div>משלוח חינם עד הבית</div>
          {/* <img src={truck} alt="" style={"width: 3em; height: 3em"} /> */}
          <Truck />
        </div>
        <CartDemo transform="translate(-10vw, 0)" />
      </div>
    </div>
  </div>
}

const calculateP = (top: number, offset: number, length: number, min?: number, max?: number) => {
  // console.log(`TOP: ${bounds.top}`)
  // console.log(`P: ${p}`)
  // console.log(`x: ${x}`)
  // console.log(`magnitude: ${magnitude}`)
  return Math.max(min ?? 0, Math.min(max ?? 1, 1 - (top - offset) / length))
}

const CartDemo: React.FC<{ transform?: string }> = ({ transform }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const onScroll = (e: Event) => {
      if (ref.current) {
        let p = calculateP(ref.current.getBoundingClientRect().top, window.outerHeight / 2, window.outerHeight * 3 / 4)
        ref.current.style.setProperty("--p", p.toString())
        if (p === 1) {
          setEnabled(true)
        }
      }
    }

    document.body.addEventListener("scroll", onScroll)
    return () => {
      document.body.removeEventListener("scroll", onScroll)
    }
  }, [])

  return <div ref={ref} class={"cart-demo no-select " + (enabled ? "enabled" : "")} /*style={transform ? "transform: " + transform : ""}*/>
    <div>
      <div style="display: flex; justify-content: space-between">
        <span style="font-size: 1.1em">סל הקניות שלי</span>
        <img style="width: 1.25em; height: 1.25em; filter: invert(var(--invert)) brightness(80%)" src={bag} alt="" />
      </div>
      <div class="cart-demo-product">
        <img style="width: 1.5em; height: 1.5em" src={testPng} alt="" />
        <div>מכחול</div>
        <div>15₪ x 1 = 15₪</div>
      </div>
      <div style="color: var(--tint); text-align: center; opacity: 0.8; font-size: 0.9em">עם אפשרויות שילוח מגוונות</div>
      <div class="cart-demo-product" style="padding: 1em">
        <span>סה״כ לתשלום</span>
        <span style="margin-right: auto">15₪</span>
      </div>
      <div class={"cart-demo-product-pay " + (enabled ? "enabled" : "")}>
        {/* <span>
        לתשלום
        </span> */}
        &nbsp;
      </div>
    </div>
    <div class="cart-demo-methods">
      <img src={visa} alt="" style="height: 0.65em" />
      <img src={mastercard} alt="" />
      <img src={bit} alt="" />
    </div>
  </div>
}

const Truck: React.FC = () => {
  return <svg class="truck" style={{ width: "3em", height: "3em", margin: "0 5vw 0 0" }} viewBox="0 0 126 62" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g style="mix-blend-mode:luminosity">
      <rect x="32" y="44" width="68" height="7" rx="3.5" fill="#FDFDFD" />
      <rect x="33" width="56" height="38" rx="4" fill="#fff" />
      <path d="M94 38C94 30.8203 99.8203 25 107 25H113C120.18 25 126 30.8203 126 38V45.6667C126 48.6122 123.612 51 120.667 51H99.8667H94V38Z" fill="#FDFDFD" />
      <path d="M97 43H123C124.657 43 126 41.6569 126 40V30.3613C126 29.4962 125.627 28.6732 124.976 28.1036L111.979 16.732C110.703 15.6154 109.065 15 107.37 15H98C95.7909 15 94 16.7909 94 19V40C94 41.6569 95.3431 43 97 43Z" fill="#FDFDFD" />
      <path d="M107.216 19H99C98.4477 19 98 19.4477 98 20V29C98 29.5523 98.4477 30 99 30H116.663C117.543 30 117.994 28.9459 117.386 28.3095L109.386 19.9286C108.82 19.3355 108.036 19 107.216 19Z" fill="var(--tint-v2)" />
      <path d="M111.5 43C106.253 43 102 47.2533 102 52.5H121C121 47.2533 116.747 43 111.5 43Z" fill="var(--tint-v2)" />
      <path d="M53.5 43C48.2533 43 44 47.2533 44 52.5H63C63 47.2533 58.7467 43 53.5 43Z" fill="var(--tint-v2)" />
      <circle class="wheel" cx="111.5" cy="54.5" r="5.5" stroke="#FDFDFD" stroke-width="4" />
      <circle class="wheel r" cx="53.5" cy="54.5" r="5.5" stroke="#FDFDFD" stroke-width="4" />
      <rect class="flames r" y="22.2" x="14" width="60" height="6" rx="2.5" fill="#FDFDFD" />
      <rect class="flames r" y="11" x="3" width="60" height="6" rx="2.5" fill="#FDFDFD" />
      <rect class="flames r" y="0" x="25" width="40" height="6" rx="2.5" fill="#FDFDFD" />
      <rect class="flames r" x="31" y="32" width="30" height="6" rx="2.5" fill="#FDFDFD" />
      <rect class="flames" y="28" x="30" width="15" height="5" rx="2.5" fill="var(--tint-v2)" />
      <rect class="flames" y="6" x="30" width="20" height="5" rx="2.5" fill="var(--tint-v2)" />
      <rect class="flames" x="30" y="17" width="30" height="5" rx="2.5" fill="var(--tint-v2)" />
    </g>
  </svg>

}

const LocationSection: React.FC = () => {
  return <>
    <div style="display: flex; align-items: center; margin: 1em 10vw; justify-content: space-between">
      <div style="font-size: 1.8em; padding: 0 0 3em 0; font-weight: 550">
        אתם מוזמנים גם,
        <br />
        לבקר אותנו בסניף ברחובות!
      </div>
      <div style="display: flex; flex-direction: column; align-items: center">
        <Pin />
        <Trail />
      </div>
    </div>
    <div class="location-bottom">
      <div class="location-info">
        <div>
          <img src={logoPng} alt="" />
        </div>
        <div>המנוף 6, רחובות</div>
      </div>
      <div class="map-container">
        <div class="map">
          <img src={map} alt="" />
          {/* <div></div> */}
        </div>
        <div class="map-buttons">
          <a href="https://ul.waze.com/ul?preview_venue_id=22806847.228068470.264234&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location">לפתיחה בוויז<img src={wazeCompact} style="width: 1.2em; height: 1.2em; vertical-align: middle; margin: 0 0.5em 0 0" /></a>
          <a href="https://www.google.com/maps/place/לב+התחביב%E2%80%AD/@31.8977,34.7984889,15z/data=!4m6!3m5!1s0x1502b71851cba4b7:0xb14666a64cb62aaf!8m2!3d31.8977!4d34.7984889!16s%2Fg%2F1v68p68z?entry=ttu">לצפייה בגוגל מפות</a>
        </div>
      </div>
    </div>
  </>
}

const Pin = () => {
  return <svg class="location-pin" viewBox="0 0 50 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g style="mix-blend-mode:multiply">
      <path d="M24.8794 0C11.1389 0 0 11.1389 0 24.8794C0.540856 32.4514 1.08171 32.7218 2.97471 36.6865C9.61326 50.5903 24.8794 69.5 24.8794 69.5C24.8794 69.5 39.7751 50.4073 46.784 36.6865C48.9475 32.4514 49.4883 29.2062 49.7588 24.8794C49.7588 11.1389 38.6199 0 24.8794 0Z" fill="var(--tint)" />
      <circle cx="25.1494" cy="24.6084" r="16.4961" fill="var(--tint-background)" />
    </g>
  </svg>
}

const Trail = () => {
  return <svg class="trail" viewBox="0 0 86 348" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity="0.2" d="M43.3921 4C104.582 70.395 84.1529 98.3947 43.3921 174C-0.0439873 254.567 -17.4973 279.264 43.3921 344" stroke="var(--text)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="25 25" />
  </svg>
}