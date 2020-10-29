const cors = require("cors");
const productsModel = require("../../model/product");
const productsWithAWSUrl = require("../../model/awsSyncProduct");

module.exports = function (app, db) {
    app.use(cors());
    app.get('/api/category', (req, res) => {
        productsModel.find().then((products) => {
            productsWithAWSUrl.allProductsWithPresignedUrl(products).then(
                (refinedProducts) => {
                    const allCategories = refinedProducts.map(product => {                      
                        return {
                            category: product.category,
                            slug: product.slug,
                            text: product.category.replace(/_+|-+/g, ' '),
                            isActive: req.params.slug == product.slug ? true : false
                        }
                    })
                    //Used for navigation active. [{key:abc, value:cd},{key:abc,value:cd}]
                    //Keywords "All" or undefined keywards will consider all category
                    const allCategoryCond = req.params.slug == "All" || typeof (req.params.slug) == 'undefined' ? true : false;

                    let allDistinctCategories = allCategories.filter((elem, index, self) => self.findIndex(
                        (t) => { return (t.category === elem.category && t.text === elem.text) }) === index);

                    /*Always place All selection on top*/
                    allDistinctCategories.unshift({ category: "All", slug: "All", text: "All", isActive: allCategoryCond });
                    res.json(allDistinctCategories);
                })
        })
    })

    app.get('/api/bestSeller', (req, res) => {
        productsModel.find().then((products) => {
            productsWithAWSUrl.allProductsWithPresignedUrl(products).then(
                (refinedProducts) => {
                    const allProducts = refinedProducts.map(product => {
                        return {
                            id: product._id,
                            name: product.name,
                            description: product.description,
                            image_url: product.image_url,
                            price: product.price,
                            category: product.category,
                            isBestSeller: product.isBestSeller,
                            promotional_price: product.promotional_price,
                            quantity: product.quantity,
                        }
                    })
                    const bestSeller = allProducts.filter(product => product.isBestSeller);
                    // const allPromolProducts = allProducts.filter(product=>product.promotional_price&&(product.promotional_price<product.price));

                    res.json(bestSeller);
                });
        })
    })

    app.get('/api/promotions', (req, res) => {
        productsModel.find().then((products) => {
            productsWithAWSUrl.allProductsWithPresignedUrl(products).then(
                (refinedProducts) => {
                    const allProducts = refinedProducts.map(product => {
                        return {
                            id: product._id,
                            name: product.name,
                            description: product.description,
                            image_url: product.image_url,
                            price: product.price,
                            category: product.category,
                            isBestSeller: product.isBestSeller,
                            promotional_price: product.promotional_price,
                            quantity: product.quantity,
                        }
                    })

                    const allPromolProducts = allProducts.filter(product => product.promotional_price && (product.promotional_price < product.price));

                    res.json(allPromolProducts);
                });
        })
    })
    app.get('/api/allProducts/:slug?', (req, res) => {
        productsModel.find().then((products) => {
            productsWithAWSUrl.allProductsWithPresignedUrl(products).then(
                (refinedProducts) => {
                    const allProducts = refinedProducts.map(product =>
                        ({
                            id: product._id,
                            name: product.name,
                            description: product.description,
                            image_url: product.image_url,
                            price: product.price,
                            category: product.category.trim(),
                            slug: product.category.trim().replace(/ +/g, '_'),//replace all spaces in category by one underscore for url
                            isBestSeller: product.isBestSeller,
                            promotional_price: product.promotional_price,
                            product_url: `/product/pid=${product._id}`,
                        })
                    )
                   
                    const allCategories = allProducts.map(product => {
                        return {
                            category: product.category,
                            slug: product.slug,
                            text: product.category.replace(/_+|-+/g, ' '),
                            isActive: req.params.slug == product.slug ? true : false
                        }
                    })
                    //Used for navigation active. [{key:abc, value:cd},{key:abc,value:cd}]
                    //Keywords "All" or undefined keywards will consider all category
                    const allCategoryCond = req.params.slug == "All" || typeof (req.params.slug) == 'undefined' ? true : false;

                    let allDistinctCategories = allCategories.filter((elem, index, self) => self.findIndex(
                        (t) => { return (t.category === elem.category && t.text === elem.text) }) === index);

                    /*Always place All selection on top*/
                    allDistinctCategories.unshift({ category: "All", slug: "All", text: "All", isActive: allCategoryCond });

                    const searchedProducts = allCategoryCond ? allProducts : allProducts.filter(product => product.slug == req.params.slug);
                    const finalProducts = {
                        title: "Products",
                        headingInfo: "Products",
                        products: searchedProducts,
                        allDistinctCategories: allDistinctCategories
                    }
                    res.json(finalProducts);
                })           
        })
    })

    app.get("/api/product/pid=:id", (req, res) => {
        productsModel.findOne({ _id: req.params.id })
            .then((item) => {
                productsWithAWSUrl.allProductsWithPresignedUrl([item]).then(
                    (refinedProducts) => {
                        const product = refinedProducts.map((item) => ({
                            id: item._id,
                            name: item.name,
                            price: item.price,
                            promotional_price: item.promotional_price,
                            description: item.description,
                            image_url: item.image_url
                        }))
                        res.json(product);
                    });
            })
    })

    app.post("/api/add", (req, res) => {
        const newProduct = {

            name: req.body.name,
            description: req.body.description,
            image_url: req.body.image_url,
            price: req.body.price,
            category: req.body.category,
            isBestSeller: req.body.isBestSeller,
            promotional_price: req.body.promotional_price,
            quantity: req.body.quantity
        }

        const product = new productsModel(newProduct);
        product.save()
            .then((item) => {
                req.session.addedProduct = item;
                req.session.generalMessage = [];
                req.files.productPic.name = `${req.files.productPic.name}`;
                req.files.productPic.path = `/img/upload/${req.files.productPic.name}`;
                req.files.productPic.mv(`public${req.files.productPic.path}`)  //Use the mv() method to place the file in public directory 
                    .then(() => {
                        productsModel.updateOne({ _id: item._id }, {//update image url by id
                            image_url: req.files.productPic.path
                        }).then(() => {
                            res.redirect("/product/list");
                        })
                    })
            })
            .catch(err => console.log(`Error happened when inserting product in the database :${err}`));

        res.json(product);
    })

    app.delete("/api/delete", (req, res) => {
        productsModel.deleteOne({ _id: req.params.id })
            .then(() => {
                req.session.generalMessage = "A product has been deleted";
                req.session.addedProduct = [];
                res.redirect("/product/list");
            })
            .catch(err => console.log(`Error happened when updating data from the database :${err}`));
        res.json(generalMessage);
    })
}