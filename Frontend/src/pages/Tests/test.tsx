type Product = {
    _id: string;
    category: string;
    sub_cat: string | undefined;
    third_level: string | undefined;
    price: number;
    name: string;
    img: string;
    desc?: string;
    selectionType?: string;
    variantsNew?: Array<any>;
};

type Tree = {
    name: string;
    productAmount: number;
    subsLength: number;
    subs?: Array<Tree>;
};

type TestType = {
    tree: Tree,
    products: Array<Product>
}

const randomColor = () => {
    return `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`
}

export const TEST_VALUES: TestType = {
    tree: {
        name: "מכחולים ואביזרים",
        subsLength: 1,
        productAmount: 0,
        subs: [
            {
                name: "מכחולים",
                subsLength: 1,
                productAmount: 0,
                subs: [
                    {
                        name: "איטקלים",
                        subsLength: 0,
                        productAmount: 4
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    },
                    {
                        name: "יוונים",
                        subsLength: 0,
                        productAmount: 0
                    }
                ]
            },
            {
                name: "שפכטלים",
                subsLength: 1,
                productAmount: 2,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 2
                    }
                ]
            },{
                name: "שפכטלים",
                subsLength: 1,
                productAmount: 2,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 2
                    }
                ]
            },{
                name: "שפכטלים",
                subsLength: 1,
                productAmount: 2,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 2
                    }
                ]
            },{
                name: "שפכטלים",
                subsLength: 1,
                productAmount: 2,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 2
                    }
                ]
            },{
                name: "שפכטלים",
                subsLength: 1,
                productAmount: 2,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 2
                    }
                ]
            },{
                name: "שפכטלים",
                subsLength: 1,
                productAmount: 2,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 2
                    }
                ]
            },{
                name: "שפכטלים",
                subsLength: 1,
                productAmount: 2,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 2
                    }
                ]
            },{
                name: "שפכטלים",
                subsLength: 1,
                productAmount: 2,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 2
                    }
                ]
            }
        ]
    },
    products: [
        {
            name: "michol psichi",
            _id: "micholbenzona",
            category: "מכחולים ואביזרים",
            sub_cat: "מכחולים",
            third_level: "איטקלים",
            desc: "michol ben ben zona!",
            selectionType: "COLOR",
            variantsNew:
                [...new Array(4)].map((_, index) => { return { title: randomColor() + ":option" + index } }),
            img: "1.png;5.png;6.png;5.png;4.png;5.png;5.png;5.png;5.png;5.png;5.png;5.png",
            price: 420
        },
        {
            name: "michol niggeri achusha that the length is too large to fit!",
            _id: "micholkushi",
            category: "מכחולים ואביזרים",
            sub_cat: "מכחולים",
            third_level: "איטקלים",
            desc: "michol ben ben zona!",
            selectionType: "COLOR",
            variantsNew:
                [...new Array(10)].map((_, index) => { return { title: randomColor() + ":option" + index } }),
            img: "1.png;5.png;6.png;5.png;4.png;5.png;5.png;5.png;5.png;5.png;5.png;5.png",
            price: 420
        },
        {
            name: "michol niggeri",
            _id: "micholkushi",
            category: "מכחולים ואביזרים",
            sub_cat: "מכחולים",
            third_level: "איטקלים",
            desc: "michol ben ben zona!",
            selectionType: "COLOR",
            variantsNew:
                [...new Array(1)].map((_, index) => { return { title: randomColor() + ":option" + index } }),
            img: "1.png;5.png;6.png;5.png;4.png;5.png;5.png;5.png;5.png;5.png;5.png;5.png",
            price: 420
        },
        {
            name: "michol niggeri",
            _id: "micholkushi",
            category: "מכחולים ואביזרים",
            sub_cat: "מכחולים",
            third_level: "איטקלים",
            desc: "michol ben ben zona!",
            img: "1.png;5.png;6.png;5.png;4.png;5.png;5.png;5.png;5.png;5.png;5.png;5.png",
            price: 420
        },
        {
            name: "schpachtel kushi",
            _id: "schpachtelkushiamiti",
            category: "מכחולים ואביזרים",
            sub_cat: "שפכטלים",
            third_level: "וואו",
            desc: "michol ben ben zona!",
            img: "4.png",
            price: 420
        },
        {
            name: "schpachtel kushi",
            _id: "schpachtelkushiloamiti",
            category: "מכחולים ואביזרים",
            sub_cat: "שפכטלים",
            third_level: "וואו",
            desc: "michol ben ben zona!",
            img: "5.png",
            price: 420
        }
    ]
}

