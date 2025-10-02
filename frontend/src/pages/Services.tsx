export default function Services() {
  const services = [
    {
      category: "Maintenance & Repair",
      icon: "🔧",
      services: [
        { name: "Engine Service", description: "Professional engine maintenance and repair", rating: 4.8 },
        { name: "Hull Cleaning", description: "Bottom cleaning and antifouling services", rating: 4.9 },
        { name: "Electrical Systems", description: "Marine electrical installation and repair", rating: 4.7 },
        { name: "Plumbing & Systems", description: "Fresh water, waste, and fuel system services", rating: 4.6 }
      ]
    },
    {
      category: "Storage & Transport",
      icon: "🏗️",
      services: [
        { name: "Dry Storage", description: "Secure indoor and outdoor boat storage", rating: 4.8 },
        { name: "Boat Transport", description: "Professional boat hauling and delivery", rating: 4.7 },
        { name: "Winterization", description: "Complete winterization and spring commissioning", rating: 4.9 },
        { name: "Shrink Wrapping", description: "Professional boat covering and protection", rating: 4.6 }
      ]
    },
    {
      category: "Detailing & Cosmetics",
      icon: "✨",
      services: [
        { name: "Full Detailing", description: "Complete interior and exterior detailing", rating: 4.9 },
        { name: "Waxing & Polishing", description: "Professional gel coat restoration", rating: 4.8 },
        { name: "Canvas & Upholstery", description: "Cleaning, repair, and replacement services", rating: 4.7 },
        { name: "Teak Restoration", description: "Teak cleaning, sanding, and refinishing", rating: 4.8 }
      ]
    },
    {
      category: "Electronics & Navigation",
      icon: "📡",
      services: [
        { name: "GPS Installation", description: "Chartplotter and navigation system setup", rating: 4.8 },
        { name: "Radar Systems", description: "Marine radar installation and calibration", rating: 4.7 },
        { name: "Audio Systems", description: "Marine stereo and entertainment systems", rating: 4.6 },
        { name: "Communication", description: "VHF radio and satellite communication", rating: 4.8 }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Marine Services Directory
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Connect with trusted marine service providers in your area. From routine maintenance 
              to major repairs, find qualified professionals for all your boating needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-secondary btn-lg">
                <span className="flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Find Services Near Me</span>
                </span>
              </button>
              <button className="btn-ghost border-white/30 hover:bg-white/10">
                <span className="flex items-center space-x-2">
                  <span>📋</span>
                  <span>List Your Business</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search services (e.g., engine repair, detailing)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Location (city, state, or zip)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="btn-primary px-8">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Service Categories
            </h2>
            <p className="text-xl text-slate-600">
              Browse by category to find the right service provider
            </p>
          </div>

          <div className="space-y-12">
            {services.map((category, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center mb-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mr-6">
                    <span className="text-3xl">{category.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-slate-900">{category.category}</h3>
                    <p className="text-slate-600">Professional services you can trust</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {category.services.map((service, serviceIndex) => (
                    <div key={serviceIndex} className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                      <h4 className="text-lg font-bold text-slate-900 mb-2">{service.name}</h4>
                      <p className="text-slate-600 text-sm mb-4">{service.description}</p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="text-sm font-semibold text-slate-700">{service.rating}</span>
                        </div>
                        <span className="text-xs text-slate-500">50+ providers</span>
                      </div>
                      
                      <button className="w-full btn-primary text-sm">
                        Find Providers
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Providers */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Featured Service Providers
            </h2>
            <p className="text-xl text-slate-600">
              Top-rated professionals in your area
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">MM</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Marina Masters</h3>
                <p className="text-slate-600">Full-Service Marine Facility</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Rating:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                    <span className="text-sm text-slate-600">(4.9)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Services:</span>
                  <span className="text-sm text-slate-700">15+ Categories</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Location:</span>
                  <span className="text-sm text-slate-700">Miami, FL</span>
                </div>
              </div>
              
              <button className="w-full btn-primary">View Profile</button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">OC</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ocean Care Detailing</h3>
                <p className="text-slate-600">Premium Boat Detailing</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Rating:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                    <span className="text-sm text-slate-600">(4.8)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Specialty:</span>
                  <span className="text-sm text-slate-700">Yacht Detailing</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Location:</span>
                  <span className="text-sm text-slate-700">San Diego, CA</span>
                </div>
              </div>
              
              <button className="w-full btn-primary">View Profile</button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">SE</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Seaside Electronics</h3>
                <p className="text-slate-600">Marine Electronics Specialists</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Rating:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                    <span className="text-sm text-slate-600">(4.7)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Specialty:</span>
                  <span className="text-sm text-slate-700">Navigation Systems</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Location:</span>
                  <span className="text-sm text-slate-700">Seattle, WA</span>
                </div>
              </div>
              
              <button className="w-full btn-primary">View Profile</button>
            </div>
          </div>
        </div>
      </section>

      {/* For Service Providers */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Are You a Marine Service Provider?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join our network of trusted professionals and connect with boat owners 
                who need your services. Grow your business with MarineMarket.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <span className="text-green-400">✓</span>
                  <span>Reach thousands of potential customers</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400">✓</span>
                  <span>Manage bookings and customer communications</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400">✓</span>
                  <span>Build your reputation with customer reviews</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400">✓</span>
                  <span>No setup fees - pay only for leads</span>
                </div>
              </div>
              
              <button className="btn-secondary btn-lg">
                <span className="flex items-center space-x-2">
                  <span>🚀</span>
                  <span>Join Our Network</span>
                </span>
              </button>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">500+</div>
                  <div className="text-blue-100">Service Providers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">10K+</div>
                  <div className="text-blue-100">Jobs Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">4.8</div>
                  <div className="text-blue-100">Average Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">50+</div>
                  <div className="text-blue-100">Cities Covered</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}