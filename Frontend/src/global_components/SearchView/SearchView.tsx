import { useEffect, useRef, useState } from "react"
import searchIcon from "../../assets/search.svg"
import { TEST_VALUES } from "../../pages/Tests/test";
import "./SearchView.css"
import { Link } from "react-router-dom";
import { Product } from "../../Types/globalTypes";
import { Arrow } from "../../pages/ProductPreviewPage/ProductPreview";

export const SearchView: React.FC<{ visible: boolean, setVisible: (v: boolean) => void }> = ({ visible, setVisible }) => {
    const ref = useRef<HTMLDivElement | null>(null)
    const [value, setValue] = useState("")

    const [searchResults, setSearchResults] = useState<Array<Product>>(
        // TEST_VALUES.products
        []
    );

    const changeHandler = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        console.log(input.value);
        setValue(input.value)
        if (input.value != "") {
            try {
                const jsonProducts: any = await fetch(
                    `http://localhost:5000/findProducts/${input.value}`,
                    { method: "GET" }
                ).then((res) => res.json())
                console.log("products found" + jsonProducts.data);
                setSearchResults(jsonProducts.data);
            } catch {
                setSearchResults([])
            }
        }
    };

    useEffect(() => {
        const clickOut = (e: MouseEvent | TouchEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setVisible(false)
            }
        }
        const onPress = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setVisible(false)
            }
        }

        window.addEventListener("touchstart", clickOut)
        window.addEventListener("mousedown", clickOut)
        window.addEventListener("keydown", onPress)

        return () => {
            window.removeEventListener("touchstart", clickOut)
            window.removeEventListener("mousedown", clickOut)
            window.removeEventListener("keydown", onPress)
        }
    }, [])

    useEffect(() => {
        if (visible) {
            ref.current?.querySelector("input")?.focus()
        }
    }, [visible])

    return  <div class={"search-view "+(visible ? "visible":"")}>
        <div class="search-view-content" ref={ref}>
            <div class="search-view-input"><img src={searchIcon} onError={(e) => e.currentTarget.style.display = "none"} onLoad={(e) => e.currentTarget.style.display = "block"} /><input value={value} onInput={changeHandler} placeholder={"חיפוש באתר"} /></div>
            {searchResults && searchResults.length > 0 &&
                <div class="search-view-results">
                    <>
                        {searchResults.map((product) => {
                            return <SearchResult product={product} />;
                        })}

                    </>

                </div>
            }
            {searchResults.length === 0 && value !== "" && <div class="search-view-no-results">אין תוצאות</div>}
            {searchResults.length > 0 && <Link to={""} className="search-results-more">
                <span>לצפייה בכלל התוצאות</span>
                <Arrow />
            </Link>}
        </div>
    </div>
}

const SearchResult: React.FC<{ product: Product }> = ({ product }) => {
    return (
        <Link to={"/product/" + product._id} className={"search-result"}>
            <div class="search-result-content">
                <div>
                    <img
                        src={"/images/" + product.img}
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                        }}
                        onLoad={(e) => {
                            e.currentTarget.style.display = "block";
                        }}
                    />
                </div>
                <div>
                    <span>{product.name}</span>
                    <span style={{ fontSize: "0.9em", opacity: 0.5 }}>{product.desc ?? ""}</span>
                </div>
            </div>
        </Link>
    );
};