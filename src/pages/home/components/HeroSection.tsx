import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TruckIcon, PackageIcon } from 'lucide-react';
import doluBike from '../../../images/dolubike.png';

const HeroSection = () => {
  const [trackingId, setTrackingId] = useState('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingId.trim()) {
      window.location.href = `/track?id=${trackingId}`;
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-b from-background to-gray-100 py-20 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Image — shows FIRST on mobile */}
          <motion.div className="order-1 lg:order-2" variants={itemVariants}>
            <motion.div
              className="relative rounded-lg overflow-hidden shadow-xl max-w-xl mx-auto lg:max-w-none"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <img
              src={doluBike}
              alt="Dolu Logistics delivery rider on bike"
              className="w-full h-auto rounded-lg"
              loading="eager"
            />
            </motion.div>
          </motion.div>

          {/* Text Content — shows AFTER image on mobile */}
          <motion.div className="max-w-xl order-2 lg:order-1" variants={itemVariants}>
            <motion.span
              className="inline-block px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-sm font-medium mb-6"
              variants={itemVariants}
            >
              Stress free delivery you can trust
            </motion.span>

            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
              variants={itemVariants}
            >
              Stress-Free Delivery. <br />
              <span className="text-primary-500">Built on Trust.</span>
            </motion.h1>

            <motion.p className="text-lg text-gray-700 mb-8" variants={itemVariants}>
              Dolu Logistics provides swift, affordable, and reliable delivery services for individuals
              and businesses across Port Harcourt and nationwide. Your goods matter. Your time matters.
              And your trust matters.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-8"
              variants={itemVariants}
            >
              <Link
                to="/track"
                className="px-6 py-3 bg-primary-500 text-white rounded-md font-medium hover:bg-primary-600 transition-colors flex items-center justify-center"
              >
                <PackageIcon className="w-5 h-5 mr-2" />
                Track Parcel
              </Link>

              <Link
                to="/request-pickup"
                className="px-6 py-3 bg-accent-500 text-white rounded-md font-medium hover:bg-accent-600 transition-colors flex items-center justify-center"
              >
                <TruckIcon className="w-5 h-5 mr-2" />
                Book a Pickup
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
