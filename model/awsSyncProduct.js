const AWS = require('aws-sdk');

const BUCKET_NAME = process.env.BUCKET_NAME;
const IAM_USER_KEY = process.env.IAM_USER_KEY;
const IAM_USER_SECRET = process.env.IAM_USER_SECRET;
const s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
    Bucket: BUCKET_NAME,
    Expires: 60 * 5
});

const awsSyncProduct =
{
    getImage(imageName) {
        return new Promise((resolve, reject) => {
            s3bucket.getObject({
                Bucket: BUCKET_NAME,
                Key: imageName
            }, (err, data) => {
                if (err) reject(err)
                else resolve(data)
            })
        })
    },
    getSignedUrl(imageName) {
        return new Promise((resolve, reject) => {
            s3bucket.getSignedUrl('getObject', {              
                Bucket: BUCKET_NAME,               
                Key: imageName
            }, (err, url) => {
                err ? reject(err) : resolve(url);
            });
        })
    },
    encode(data) {
        let buf = Buffer.from(data);
        let base64 = buf.toString('base64');
        return base64
    },
    allProductsWithPresignedUrl(products) {
        let counter = 0;
        let allProducts = [];
        return new Promise((resolve, reject) => {
            products.map(product => {
                let currentProduct = product;
                this.getSignedUrl(product.image_url).then((url) => {                  
                    currentProduct.image_url = url;
                    counter++;
                    allProducts.push(currentProduct);
                    if (counter === products.length) {
                        resolve(allProducts);
                    }
                })
            });
        })
    },
    uploadProductImage(file) {
        return new Promise((resolve, reject) => {
            s3bucket.createBucket(function () {
                var params = {
                    Bucket: BUCKET_NAME,
                    Key: file.name,
                    Body: file.data
                };
                s3bucket.upload(params, function (err, data) {
                    if (err) {
                        console.log('error in callback');
                        console.log(err);
                        reject(err);
                    }
                    resolve(data);
                });
            });

        })

    }
}

module.exports = awsSyncProduct;