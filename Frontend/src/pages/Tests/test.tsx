type Product = {
  _id: string;
  category: string;
  sub_cat: string | undefined;
  third_level: string | undefined;
  price: number;
  name: string;
  img: string;
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

export const TEST_VALUES:TestType = {
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
            img: "",
            price: 420
        }
    ]
}