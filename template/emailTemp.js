const sgMail = require('@sendgrid/mail');
const emailTemplate = {

    orderDetail(orderInfo, userInfo) {
        var orderList = "";
        orderInfo.products.forEach(element => {
            if (element.promotional_price) {
                orderList += `
                <div style="display:flex">
                <a href="https://leeyonge.netlify.app/product/pid=${element.id}" style="width: 30%">
                <img src="${element.image_url}" style="width:60%"/>
                </a>
                <div><li><p>Product name:${element.name}; </p>
                <p>Unit purchased: ${element.quantity}; </p>                         
                <p>Item sell price: $${element.promotional_price};</p></li></div>
                </div>`

            } else {
                orderList += `
                <div style="display:flex">
                <a href="https://leeyonge.netlify.app/product/pid=${element.id}" style="width: 30%">
                <img src="${element.image_url}" style="width:60%"/>
                </a>
                <div><li><p>Product name:${element.name}; </p>
                <p>Unit purchased: ${element.quantity}; </p>                         
                <p>Item sell price: $${element.price};</p></li>
                </div></div>`

            }
        })
        var name="";
        if(userInfo.firstName && userInfo.lastName){
            name=userInfo.firstName+ ' '+ userInfo.lastName;
        }else{
            name="customer";
        }
        console.log("name: ", name)      
      
        const emailTemplate = `<h2>Dear ${name}</h2>
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
            html: emailTemplate

        };
        sgMail.send(msg)
            .then(() => {
                console.log(`Email sent!`)
            })
            .catch(err => {
                console.log(`Error ${err}`);
            })
    }
}

module.exports = emailTemplate;