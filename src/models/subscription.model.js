import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // one who is subscribing
        ref: "User"

    },
    channel: {
        type: Schema.Types.ObjectId,  // this is one who is being subscribed
        ref: "User"
    },



}, {timestamps: true})




export const Subscription = model("subscription", subscriptionSchema)