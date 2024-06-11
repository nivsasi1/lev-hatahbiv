type Product = {
    _id: string;
    category: string;
    sub_cat: string | undefined;
    third_level: string | undefined;
    price: number;
    name: string;
    img: string;
    desc?: string;
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
                        productAmount: 1
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
                productAmount: 1,
                subs: [
                    {
                        name: "וואו",
                        subsLength: 0,
                        productAmount: 1
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
            img: "",
            price: 420
        },
        {
            name: "michol niggeri",
            _id: "micholkushi",
            category: "מכחולים ואביזרים",
            sub_cat: "מכחולים",
            third_level: "איטקלים",
            desc: "michol ben ben zona!",
            img: "",
            price: 420
        },
        {
            name: "michol kushi",
            _id: "micholkushiamiti",
            category: "מכחולים ואביזרים",
            sub_cat: "שפכטלים",
            third_level: "וואו",
            desc: "michol ben ben zona!",
            img: "",
            price: 420
        }
    ]
}