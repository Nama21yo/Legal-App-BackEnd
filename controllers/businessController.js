const Business = require('../models/businessModel');
const Contact = require('../models/contactModel');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');

const createBusinessController = async (req, res) => {
  const { 
    category, 
    businessName, 
    address, 
    rating, 
    description, 
    fees, 
    years, 
    clients, 
    phoneNumber,
    headstoneNames,
    reviews,
    priceStartsFrom
  } = req.body;

  try {
    let businessImages = [];
    let headstoneImage = null;

    if (req.files.businessImages) {
      const uploadPromises = req.files.businessImages.map((file) =>
        cloudinary.uploader.upload(file.path)
      );
      const uploadResults = await Promise.all(uploadPromises);
      businessImages = uploadResults.map((result) => result.secure_url);
    }

    if (req.files.headstoneImage) {
      const uploadPromises = req.files.headstoneImage.map((file) =>
        cloudinary.uploader.upload(file.path)
      );
      const uploadResults = await Promise.all(uploadPromises);
      headstoneImage = uploadResults.map((result) => result.secure_url);
    }

    const newBusinessData = {
      category,
      businessName,
      businessImages,
      address,
      rating,
      description,
      fees,
      years,
      clients,
      reviews,
      phoneNumber,
    };

    if (category.toLowerCase() === "headstones") {
      if (headstoneNames) {
        newBusinessData.headstoneNames = Array.isArray(headstoneNames)
          ? headstoneNames
          : [headstoneNames];
      }
      if (priceStartsFrom) {
        newBusinessData.priceStartsFrom = Array.isArray(priceStartsFrom)
          ? priceStartsFrom
          : [priceStartsFrom];
      }
      if (headstoneImage) {
        newBusinessData.headstoneImage = Array.isArray(headstoneImage)
          ? headstoneImage
          : [headstoneImage];
      }
    }

    const newBusiness = new Business(newBusinessData);
    const savedBusiness = await newBusiness.save();

    const responseBusiness = {
      ...savedBusiness._doc,
      fees: `$${savedBusiness.fees.toLocaleString()}`,
      ...(savedBusiness.priceStartsFrom && {
        priceStartsFrom: `$${savedBusiness.priceStartsFrom.toLocaleString()}`,
      }),
    };

    res.status(201).json(responseBusiness);
  } catch (error) {
    console.error("Error creating business:", error);
    res.status(500).json({ message: "Failed to create business", error: error.message });
  }
};

const getBusinessesController = async (req, res) => {
  const { category } = req.params;

  try {
    const businesses = await Business.find({ category });
    res.status(200).json(businesses);
  } catch (error) {
    console.error('Error fetching businesses by category:', error);
    res.status(500).json({ message: 'Failed to fetch businesses by category', error: error.message });
  }
};

const updateBusinessController = async (req, res) => {
  const { id } = req.params;
  const {
    businessName,
    address,
    rating,
    description,
    fees,
    years,
    clients,
    phoneNumber,
    reviews,
    headstoneNames,
    priceStartsFrom
  } = req.body;

  try {
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Update text fields or basic details
    business.businessName = businessName || business.businessName;
    business.address = address || business.address;
    business.rating = rating || business.rating;
    business.description = description || business.description;
    business.fees = fees || business.fees;
    business.years = years || business.years;
    business.clients = clients || business.clients;
    business.phoneNumber = phoneNumber || business.phoneNumber;
    business.reviews = reviews || business.reviews;

    // Override headstone details
    if (headstoneNames) {
      business.headstoneNames = Array.isArray(headstoneNames) ? headstoneNames : [headstoneNames];
    }

    if (priceStartsFrom) {
      business.priceStartsFrom = Array.isArray(priceStartsFrom) ? priceStartsFrom : [priceStartsFrom];
    }

    if (req.files && req.files.headstoneImage) {
      const uploadPromises = req.files.headstoneImage.map((file) =>
        cloudinary.uploader.upload(file.path)
      );
      const uploadResults = await Promise.all(uploadPromises);
      business.headstoneImage = uploadResults.map((result) => result.secure_url); // Overwrite existing images
    }

    // Override businessImages if provided
    if (req.files && req.files.businessImages) {
      const uploadPromises = req.files.businessImages.map((file) =>
        cloudinary.uploader.upload(file.path)
      );
      const uploadResults = await Promise.all(uploadPromises);
      business.businessImages = uploadResults.map((result) => result.secure_url); // Overwrite existing images
    }

    // Save updated business
    const updatedBusiness = await business.save();
    res.status(200).json(updatedBusiness);
  } catch (error) {
    console.error("Error updating business:", error);
    res.status(500).json({ message: "Failed to update business", error: error.message });
  }
};

const getRecentBusinessController = async (req, res) => {
  try {
    console.log('Fetching the most recent business...');

    // Log before the query
    const businessesCount = await Business.countDocuments(); 
    console.log('Total businesses in the database:', businessesCount);

    const recentBusiness = await Business.findOne().sort({ timestamp: -1 });

    // Log the result from the query
    console.log('Recent business data:', recentBusiness);

    if (!recentBusiness) {
      return res.status(404).json({ message: "No businesses found" });
    }

    res.status(200).json(recentBusiness);
  } catch (error) {
    console.error("Error fetching recent business:", error);
    res.status(500).json({ message: "Failed to fetch recent business", error: error.message });
  }
};





const deleteBusinessController = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedBusiness = await Business.findByIdAndDelete(id);
    if (!deletedBusiness) return res.status(404).json({ message: 'Business not found' });

    res.status(200).json({ message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ message: 'Failed to delete business', error: error.message });
  }
};

const deleteBusinessImagesController = async (req, res) => {
  const { id } = req.params;
  const { imagesToDelete } = req.body;

  if (!Array.isArray(imagesToDelete) || imagesToDelete.length === 0) {
    return res.status(400).json({ message: 'No images specified for deletion' });
  }

  try {
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const remainingImages = business.businessImages.filter(
      (image) => !imagesToDelete.includes(image)
    );

    if (remainingImages.length === business.businessImages.length) {
      return res.status(400).json({ message: 'No matching images found to delete' });
    }

    business.businessImages = remainingImages;
    await business.save();

    const deletePromises = imagesToDelete.map((imageUrl) => {
      const publicId = imageUrl.split('/').pop().split('.')[0];
      return cloudinary.uploader.destroy(publicId);
    });
    await Promise.all(deletePromises);

    res.status(200).json({
      message: 'Images deleted successfully',
      remainingImages: business.businessImages,
    });
  } catch (error) {
    console.error('Error deleting business images:', error);
    res.status(500).json({ message: 'Failed to delete images', error: error.message });
  }
};

const contactedBusinessController = async (req, res) => {
  const { userId, businessId } = req.body;

  if (!mongoose.isValidObjectId(businessId)) {
    return res.status(400).json({ message: 'Invalid businessId format' });
  }

  try {
    const businessExists = await Business.findById(businessId);
    if (!businessExists) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const newContact = new Contact({
      user: userId,
      business: businessId,
    });

    const savedContact = await newContact.save();

    const populatedContact = await Contact.findById(savedContact._id)
      .populate('business', 'businessName address category description rating businessImage');

    res.status(201).json({
      message: 'Contact created successfully',
      contact: {
        _id: savedContact._id,
        user: savedContact.user,
        business: populatedContact.business,
        timestamp: savedContact.timestamp
      }
    });
  } catch (error) {
    console.error('Error logging contact:', error);
    res.status(500).json({ message: 'Failed to log contact', error: error.message });
  }
};

const getContactedBusinessesController = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid userId format' });
  }

  try {
    const contacts = await Contact.find({ user: userId })
      .populate({
        path: 'business',
        select: 'businessName address category description rating businessImage'
      })
      .sort({ timestamp: -1 });

    if (!contacts || contacts.length === 0) {
      return res.status(404).json({ message: 'No contacted businesses found for this user', contacts: [] });
    }

    const formattedContacts = contacts.map(contact => ({
      contactId: contact._id,
      timestamp: contact.timestamp,
      business: {
        id: contact.business._id,
        businessName: contact.business.businessName,
        address: contact.business.address,
        category: contact.business.category,
        description: contact.business.description,
        rating: contact.business.rating,
        businessImage: contact.business.businessImage
      }
    }));

    res.status(200).json({
      message: 'Contacts retrieved successfully',
      count: formattedContacts.length,
      contacts: formattedContacts
    });
  } catch (error) {
    console.error('Error fetching contacted businesses:', error);
    res.status(500).json({ message: 'Failed to fetch contacted businesses', error: error.message });
  }
};

const checkBusinessContactStatus = async (req, res) => {
  const { userId, businessId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid userId format' });
  }

  try {
    const allContacts = await Contact.find({ user: userId })
      .populate('business', 'businessName address category description rating businessImage')
      .sort({ timestamp: -1 });

    const validContacts = allContacts.filter(contact => contact.business !== null);

    if (businessId && mongoose.isValidObjectId(businessId)) {
      const specificContact = validContacts.find(
        contact => contact.business._id.toString() === businessId
      );

      const contactStatus = {
        contacted: !!specificContact,
        timestamp: specificContact ? specificContact.timestamp : null,
        business: specificContact ? specificContact.business : null
      };

      return res.status(200).json({
        currentBusinessStatus: contactStatus,
        allContacts: validContacts.map(contact => ({
          businessId: contact.business._id,
          businessName: contact.business.businessName,
          address: contact.business.address,
          category: contact.business.category,
          description: contact.business.description,
          rating: contact.business.rating,
          businessImage: contact.business.businessImage,
          timestamp: contact.timestamp
        }))
      });
    }

    return res.status(200).json({
      allContacts: validContacts.map(contact => ({
        businessId: contact.business._id,
        businessName: contact.business.businessName,
        address: contact.business.address,
        category: contact.business.category,
        description: contact.business.description,
        rating: contact.business.rating,
        businessImage: contact.business.businessImage,
        timestamp: contact.timestamp
      }))
    });
  } catch (error) {
    console.error('Error checking contact status:', error);
    res.status(500).json({ message: 'Failed to check contact status', error: error.message });
  }
};

module.exports = {
  getContactedBusinessesController,
  checkBusinessContactStatus,
  createBusinessController,
  deleteBusinessController,
  updateBusinessController,
  getBusinessesController,
  contactedBusinessController,
  deleteBusinessImagesController,
  getRecentBusinessController
};
