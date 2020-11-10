const cors = require("cors");
const { authenticate } = require('./../../middleware/authenticate');
const sgMail = require('@sendgrid/mail');
const productsModel = require("../../model/product");
const shoppingCartModel = require("./../../model/shoppingCart");
const usersModel = require("../../model/user");
const orderHistoryModel = require("../../model/orderHistory");
const productsWithBase64Img = require("../../model/awsSyncProduct");

module.exports = function (app, db) {
    app.use(cors());

    app.post("/api/shoppingcart/add", authenticate, async (req, res) => {

        const { userId } = req.session;

        const cartProducts = req.body.products;

        const shoppingCartProduct = {
            uid: userId,
            products: cartProducts
        }

        const cart = new shoppingCartModel(shoppingCartProduct);

        const getProductDetailById = async (pid) => {
            //let 
            let result = "Not finding the product id in DB";
            try {
                result = await productsModel.findOne({ _id: pid }).then(item =>
                    ({
                        pid: item._id,
                        quantity: cart.products[0].quantity,
                        unit_price: (item.price) ? item.price : 0,
                        promotion_price: item.promotional_price ? item.promotional_price : 0,
                        productName: item.name,
                        category: item.category,
                        image_url: item.image_url,
                        unit_total: parseFloat(cart.products[0].quantity * (item.promotional_price ? item.promotional_price : item.price)).toFixed(2)
                    })
                );
            }
            catch (ex) {
            }
            return result;
        }

        const findCartByUserId = (uid) => new Promise((resolve, reject) => {
            shoppingCartModel.findOne({ uid: uid }).then((cartInfo, err) => {
                if (err) reject(err)
                resolve(cartInfo)
            });
        })

        const updateCartTotal = (uid, addedProductId, message) => {
            try {
                findCartByUserId(uid).then((cartInfo) => {
                    //getProductDetailById(cart.products[0].pid).then((item)=>item);

                    const subTotal = cartInfo.products.map(product => ((product.promotion_price ? product.promotion_price : product.unit_price) * product.quantity)).reduce((x, y) => { return (x + y) }).toFixed(2);

                    shoppingCartModel.updateOne({ uid: uid }, { $set: { cart_total: subTotal } }).then(() => {
                        cartInfo.cart_total = subTotal; // return to json

                        res.json({
                            statusMessage: message,
                            addedProductId: addedProductId,
                            cartInfo: cartInfo
                        })
                    });
                })

            } catch (err) {
                res.json({
                    errorMessage: err
                })
            }
        }

        const updateCart = (cart, message, isExistedProduct) => {
            getProductDetailById(cart.products[0].pid).then((cartProduct) => {
                const updateFilterOptions = isExistedProduct ? {
                    uid: cart.uid,
                    "products.pid": cartProduct.pid
                } : {
                        uid: cart.uid,
                    }
                const updateOperationOptions = isExistedProduct ?
                    {
                        $set: {
                            "products.$.productName": cartProduct.productName,
                            "products.$.quantity": cartProduct.quantity,
                            "products.$.unit_price": cartProduct.unit_price,
                            "products.$.promotion_price": cartProduct.promotion_price ? cartProduct.promotion_price : 0,
                            "products.$.unit_total": cartProduct.unit_total
                        }
                    } : {
                        $push: {
                            "products": cartProduct
                        }
                    };
                shoppingCartModel.update(updateFilterOptions, updateOperationOptions).then(() => {
                    updateCartTotal(cart.uid, cartProduct.pid, message)
                })
            });
        }

        shoppingCartModel.findOne({ uid: cart.uid }).then((ct) => {
            if (ct) {
                const existProduct = ct.products.filter(product => product.pid == cart.products[0].pid).length ? true : false;
                let message;
                if (existProduct) {
                    const itemIndex = ct.products.findIndex(p => p.pid == cart.products[0].pid);
                    let productItem = ct.products[itemIndex];
                    const newQuantity = productItem.quantity + cart.products[0].quantity;
                    cart.products[0].quantity = newQuantity;
                    message = `Existed product is updated in the cart for this user!`;
                } else {
                    message = `A new proudct has been added to the shopping cart for the user!`;
                }
                updateCart(cart, message, existProduct);

            } else {
                cart.save()
                    .then((cartItems) => {
                        let item = cartItems.products[0];
                        getProductDetailById(item.pid).then((product) => {
                            shoppingCartModel.findOneAndUpdate({ uid: cart.uid }, {
                                $pull: {
                                    "products": { pid: item.pid }
                                }
                            }).then(() => {
                                shoppingCartModel.findOneAndUpdate({ uid: cart.uid },
                                    { $push: { products: product } }).then(() => {
                                        updateCartTotal(cart.uid, item.pid, 'New user added a product to the shopping cart');
                                    })
                            })
                        });
                    }).catch(err => res.json(err));
            }
        }).catch(err => res.json(err));
    })

    app.get("/api/shoppingcart", authenticate, async (req, res) => {

        const { userId } = req.session;
        const cartProducts = req.body.products;
        const shoppingCartProduct = {
            uid: userId,
            products: cartProducts
        }
        const cart = new shoppingCartModel(shoppingCartProduct);
        shoppingCartModel.findOne({ uid: cart.uid }).then((ct) => {
            if (ct) {
                if (ct.cart_total !== 0) {
                    const allProductsIds = ct.products.map(p => p.pid);
                    productsModel.find({ _id: { $in: allProductsIds } }).then((items) => {
                        productsWithBase64Img.allProductsWithPresignedUrl(items).then(
                            (refinedProducts) => {

                                const products = refinedProducts.map(item => {
                                    return {
                                        id: item._id,
                                        name: item.name,
                                        price: item.price,
                                        description: item.description,
                                        image_url: item.image_url,
                                        promotion_price: item.promotional_price
                                    }
                                })
                                const productsJoined = products.map((product) => {
                                    product.purchased_quantity = ct.products.filter((p) => { return (product.id == p.pid) ? p.quantity : 0 })[0].quantity;
                                    return product;
                                });
                                const cartInfo = {
                                    uid: userId,
                                    productInfo: productsJoined,
                                    cart_total: ct.cart_total
                                }
                                res.json(cartInfo);
                            })
                    })
                }
                else {
                    const emptyCart = {
                        message: "cart is empty"
                    }
                    res.json(emptyCart);
                }
            }
            else {
                const unLogIn = {
                    message: "Please log in first!"
                }
                res.json(unLogIn);
            }
        }).catch((err) => {
            res.json(err)
        })
    })

    app.post("/api/shoppingcart/update", authenticate, async (req, res) => {
        const { userId } = req.session;
        let updatedCart = [];

        shoppingCartModel.find({ uid: userId }).then(() => {
            updatedCart = req.body.products;
            updatedCart.forEach((product) => {
                productsModel.find({ _id: { $in: product.pid } }).then((items) => {
                    var productsInCart = items.map(item => {
                        return {
                            pid: item._id,
                            unit_price: (item.price) ? item.price : 0,
                            promotion_price: item.promotional_price,
                            productName: item.name,
                            category: item.category,
                            image_url: item.image_url,
                            quantity: (product.quantity) ? product.quantity : 0,
                            unit_total: parseFloat(product.quantity * (item.promotional_price ? item.promotional_price : item.price)).toFixed(2)
                        }
                    })

                    let message = '';
                    // remove all products in cart first, then push them into cart again with new quantity
                    const removeALlCartProducts = productsInCart.map((productInCart) => {
                        return shoppingCartModel.updateOne({ uid: userId }, { $pull: { products: { pid: productInCart.pid } } }).then(() => {
                            console.log(`Product ${productInCart.productName} is removed`)

                        })
                    })
                    Promise.all(removeALlCartProducts).then(() => {
                        const addBackAllCartProducts = productsInCart.map((productInCart) => {
                            return shoppingCartModel.findOneAndUpdate({ uid: userId }, { $push: { products: productInCart } }).then(() => {
                                message = `${productInCart.productName} is updated`;
                            });
                        });
                        Promise.all(addBackAllCartProducts).then(() => {
                            shoppingCartModel.findOne({ uid: userId }).then((cartProducts) => {
                                const subTotal = cartProducts.products.map(product => product.unit_total).reduce((x, y) => { return (x + y) }).toFixed(2);
                                shoppingCartModel.updateOne({ uid: userId }, { $set: { cart_total: subTotal } }).then(() => {
                                    cartProducts.cart_total = subTotal;
                                    const cartInfo = {
                                        userId: userId,
                                        productInfo: cartProducts,
                                        message: message,
                                    }
                                    res.json(cartInfo);
                                })
                            });
                        })
                    })
                })
            })
        }).catch(err => console.log(`${err}`));
    })

    app.delete("/api/shoppingcart/delete", authenticate, async (req, res) => {
        const { userId } = req.session;
        let productsToDelete = [];

        shoppingCartModel.find({ uid: userId }).then(() => {
            productsToDelete = req.body.products;
            productsToDelete.forEach((product) => {
                productsModel.find({ _id: { $in: product.pid } }).then((items) => {
                    var productsInCart = items.map(item => {
                        return {
                            pid: item._id,
                            unit_price: (item.price) ? item.price : 0,
                            promotion_price: item.promotional_price,
                            name: item.name,
                            category: item.category,
                            image_url: item.image_url
                        }
                    })

                    let messages = [];
                    let deletedProducts = [];
                    const removeAllCartProducts = productsInCart.map((productInCart) => {

                        return shoppingCartModel.findOneAndUpdate({ uid: userId, "products.pid": productInCart.pid }, { "$pull": { "products": { "pid": productInCart.pid } } }).then((item) => {

                            deletedProducts.push(productInCart);
                            messages.push(`Product ${productInCart.name} is removed!`);

                        })
                    })
                    Promise.all(removeAllCartProducts).then(() => {
                        shoppingCartModel.findOne({ uid: userId }).then((cart) => {
                            console.log(cart)
                            const subTotal = cart.products.length ? cart.products.map(product => product.unit_total).reduce((x, y) => { return (x + y) }).toFixed(2) : 0.00;
                            shoppingCartModel.updateOne({ uid: userId }, { $set: { cart_total: subTotal } }).then(() => {
                                cart.cart_total = subTotal;
                                const cartInfo = {
                                    userId: userId,
                                    cartInfo: cart,
                                    deletedProducts: deletedProducts,
                                    messages: messages
                                }
                                res.json(cartInfo);
                            })
                        });
                    })
                })
                    .catch(err => res.json(err.message));
            })
        })
            .catch(err => console.log(`${err}`));
    })

    app.post("/api/shoppingcart/checkout", authenticate, async (req, res) => {

        const { userId } = req.session;
        const order_date = new Date();
        let userInfo = {};
        let checkoutProducts = [];

        usersModel.findOne({ _id: userId }).then((user) => {
            userInfo = {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        })
        const findOrderByUserId = (uid) => new Promise((resolve, reject) => {
            orderHistoryModel.findOne({ uid: uid }).then((orderInfo, err) => {
                if (err) reject(err);
                resolve(orderInfo)
            });
        })
        const updateOrderHistory = (uid, orderItems) => {
            try {
                findOrderByUserId(uid).then(() => {
                    orderHistoryModel.updateOne(
                        { uid: uid },
                        {
                            $push:
                            {
                                "orders": orderItems.orders[0],
                            }
                        }
                    ).then(() => {
                        console.log(`updated successful`)
                    })
                })
            } catch (err) {
                res.json({ err });
            }

        }
        let syncItemsWithCart = (items, cartUserItem) => {
            let checkoutProducts = [];
            items.forEach(item => {
                cartUserItem.products.forEach(cartProduct => {
                    if (item._id == cartProduct.pid) {
                        const checkoutProduct = {
                            id: item._id,
                            name: item.name,
                            price: item.price,
                            promotional_price: item.promotional_price,
                            quantity: cartProduct.quantity,
                            description: item.description,
                            image_url: item.image_url
                        }
                        checkoutProducts.push(checkoutProduct)
                    }
                })
            })
            return checkoutProducts;
        }
        shoppingCartModel.findOneAndDelete({ uid: userId }).then((cartUserItem) => {
            allProductsIds = cartUserItem.products.map(p => p.pid);
            productsModel.find({ _id: { $in: allProductsIds } }).then((items) => {
                productsWithBase64Img.allProductsWithPresignedUrl(items).then(
                    (refinedProducts) => {
                        //syncItemsWithCart
                        const orderInfo = {
                            cart_total: cartUserItem.cart_total,
                            products: syncItemsWithCart(items, cartUserItem),
                            date: order_date
                        }

                        res.json({
                            userInfo: userInfo,
                            orders: orderInfo
                        });

                        var orderList = "";
                        orderInfo.products.forEach(element => {
                            if (element.promotional_price) {
                                orderList += `
                                <li><p>Product name:${element.name}; </p>
                                <p>Unit purchased: ${element.quantity}; </p>                         
                                <p>Item sell price: $${element.promotional_price};</p></li>`

                            } else {
                                orderList += `<li><p>Product name:${element.name}; </p>
                                <p>Unit purchased: ${element.quantity}; </p>                         
                                <p>Item sell price: $${element.price};</p></li>`
                            }
                        })

                        const emailTemplate = `<h2>Dear ${userInfo.firstName} ${userInfo.lastName}</h2>
                        <p>You have purchased the following items in our store!</p>
                        <ul>
                            ${orderList}
                        </ul>
                        <br/>
                        ------------------------
                        <br/>
                        <p>Your subtotal: $${orderInfo.cart_total}</p>
                        <p>Total with tax: $${(orderInfo.cart_total * 1.13).toFixed(2)}</p>`
                        sgMail.setApiKey(process.env.SEND_GRID_API_KEY);
                        const msg = {
                            from: `${process.env.SENDER_EMAIL_ADDRESS}`,
                            to: `${userInfo.email}`,
                            bcc: `${process.env.SENDER_EMAIL_ADDRESS}`,
                            subject: 'Your Purchase Detial',
                            html: emailTemplate,
                        };
                        sgMail.send(msg)
                            .then(() => {
                                console.log(`Email sent!`)
                            })
                            .catch(err => {
                                console.log(`Error ${err}`);
                            })
                    }
                )

                const orderInfo = {
                    cart_total: cartUserItem.cart_total,
                    products: syncItemsWithCart(items, cartUserItem),
                    date: order_date
                }
                const orderItems = {
                    uid: userId,
                    orders: orderInfo
                }
                const orderHistory = new orderHistoryModel(orderItems);

                orderHistoryModel.findOne({ uid: userId }).then((orders) => {

                    if (orders) {
                        updateOrderHistory(userId, orderHistory);
                    }
                    else {
                        orderHistory.save().then((history) => {
                            console.log(history)
                        });
                    }
                })
            })
        })
    })

    app.get("/api/orderhistory", authenticate, async (req, res) => {
        const { userId } = req.session;
        const orderItems = {
            uid: userId
        }
        const orderHistory = new orderHistoryModel(orderItems);
        async function waitForPresetImageUrl(orders) {
            const finalOrders = [...orders];
            try {
                const promises = [];
                orders.forEach(order => {
                    promises.push(productsWithBase64Img.allProductsWithPresignedUrl(order.products))
                })
                await Promise.all(promises).then(products => {
                    for (let i in products) {
                        finalOrders[i].products = products[i];
                    }
                })
            } catch (ex) {

            }
            return finalOrders;
        }
        orderHistoryModel.findOne({ uid: orderHistory.uid }).then((orderedItems) => {
            if (orderedItems) {
                waitForPresetImageUrl(orderedItems.orders).then(orders => {
                    const orderInfo = {
                        uid: userId,
                        orders: orders
                    }
                    res.json(orderInfo)
                })
            }
            else {
                const emptyOrder = {
                    message: "there is no order history"
                }
                res.json(emptyOrder);
            }
        }).catch((err) => {
            res.json(err)
        })
    })
}