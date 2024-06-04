import { useRef } from "react"
export const ProductPreview: React.FC = () => {
    let img = useRef<HTMLImageElement | null>(null)
    return <>
        <div className={"product-preview"}>
            <div className={"product-preview-img"}><img ref={img} onError={() => {
                if (img.current) {
                    img.current!.style.display = 'none'
                }
            }} src="" alt="" /></div>
            <div>
                <div className={"product-preview-info"}>
                    <div className={"product-preview-info-content"}>
                        <div className={"product-preview-name"}>מכחול גומי - סט 5 מונט מרט</div>
                        <div>מידע אודות המוצר</div>
                        <div>סט של 5 מכחולי גומי לציור ופיסול, כל מכחול בצורה שונה .
                            משמש להנחת והסרת צבע, טשטוש פחם ופסטלים, החלקה ויצרת תבליט על חימר לסוגיו, כמו כן מתאים לדבק ולנוזל מיסוך לצבעי מים.</div>
                    </div>
                </div>
                <div className={"product-preview-buttons"}>
                    <div class={"product-preview-add"}>הוספה לסל</div>
                    <div></div>
                </div>
            </div>
        </div>
    </>
}