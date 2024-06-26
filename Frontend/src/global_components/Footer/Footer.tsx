import "./Footer.css"
import logoWhite from "../../assets/logo_white.png"
import facebookLogoWhite from "../../assets/Facebook_white.png"
import instagramLogoWhite from "../../assets/Instagram_White.svg"
import { Link } from "react-router-dom"

export const Footer: React.FC = () => {
    return (
        <footer><svg style={"width: 0; height: 0;"} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <clipPath id="clip" clipPathUnits="objectBoundingBox">
                    <path d="M0,0.1 C0.5,-0.05 0.5,0.2 1,0.05 L1,1 0,1 Z" fill="#000"></path>
                </clipPath>
                <clipPath id="clip-location" clipPathUnits="objectBoundingBox">
                    <path d="M0,0.1 C0.5,-0.05 0.5,0.2 1,0.05 L1,0.95 C0.45,1.05 0.5,0.85 0,1 Z" fill="#000"></path>
                </clipPath>
            </defs>
            <path d="M0,0 1,1" fill="#000"></path>
        </svg>
            <div className={"footer-info"}>
                <div class="footer-section">
                    <div>שעות פתיחה</div>
                    <div>ימים א' - ו' : 9:00 - 13:30</div>
                    <div>ימים א', ב', ד', ה': 16:00 - 18:00</div>
                </div>
                <div className={"h-divider"}></div>
                <div className="footer-section">
                    <div>כתובת</div>
                    <div>המנוף 6 רחובות</div>
                </div>
                <div className="h-divider"></div>
                <div className={"footer-section"}>
                    <div>צרו איתנו קשר</div>
                    <div>
                        טלפקס -&nbsp;<a href="tel://+972089315213">08-9315213</a>
                    </div>
                    <div>דוא״ל - <a href="mailto:levhatahbiv@gmail.com">levhatahbiv@gmail.com</a></div>
                </div>
            </div>
            <div className={"footer-logos"}>
                <Link to={"/"}><img className={"main-logo"} src={logoWhite} alt="" /></Link>
                <div>
                    <a href="https://www.facebook.com/people/לב-התחביב/100063707706615/">
                        <img src={facebookLogoWhite} alt="" />
                    </a>
                    <a href="https://www.instagram.com/levhatahbiv/">
                        <img src={instagramLogoWhite} alt="" />
                    </a>
                </div>
            </div>
        </footer>
    )
}
