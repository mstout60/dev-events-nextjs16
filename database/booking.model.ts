import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import Event from './event.model';

// TypeScript interface for Booking document
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email: string) {
          // RFC 5322 compliant email validation regex
          const emailRegex =
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          return emailRegex.test(email);
        },
        message: "Invalid email format",
      },
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Pre-save hook: Verify that the referenced event exists
BookingSchema.pre("save", async function () {
  if (this.isNew || this.isModified("eventId")) {
    let eventExists: boolean;
    try {
      eventExists = !!(await Event.exists({ _id: this.eventId }));
    } catch (error) {
      throw new Error("Failed to validate event reference: database error");
    }
    if (!eventExists) {
      throw new Error("Referenced event does not exist");
    }
  }
});

// Index on eventId for faster queries when retrieving bookings by event
BookingSchema.index({ eventId: 1 });

// Create compound index for common queries (events bookings by date)
BookingSchema.index({ eventId: 1, createdAt: -1 });

// Create index on email for user booking lookups
BookingSchema.index({ email: 1 });

// Enforce one booking per events per email
BookingSchema.index({ eventId: 1, email: 1 }, { unique: true, name: 'uniq_event_email' });


// Prevent model recompilation in development
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
