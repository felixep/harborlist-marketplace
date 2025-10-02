export default function Insurance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Boat Insurance Made Simple
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Protect your investment with comprehensive boat insurance. Compare quotes from 
              top marine insurers and find the perfect coverage for your vessel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-secondary btn-lg">
                <span className="flex items-center space-x-2">
                  <span>📋</span>
                  <span>Get Free Quote</span>
                </span>
              </button>
              <button className="btn-ghost border-white/30 hover:bg-white/10">
                <span className="flex items-center space-x-2">
                  <span>🧮</span>
                  <span>Calculate Coverage</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Types */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Types of Boat Insurance Coverage
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Choose the right protection for your boating lifestyle
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Hull Coverage</h3>
              <p className="text-slate-600 mb-6">
                Protects the physical structure of your boat against damage from collisions, 
                storms, fire, theft, and vandalism.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Collision damage</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Weather damage</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Theft protection</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Fire damage</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">⚖️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Liability Coverage</h3>
              <p className="text-slate-600 mb-6">
                Covers bodily injury and property damage you may cause to others while 
                operating your boat.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Bodily injury liability</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Property damage liability</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Legal defense costs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Guest passenger liability</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🎣</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Personal Property</h3>
              <p className="text-slate-600 mb-6">
                Protects your personal belongings, fishing equipment, and other items 
                on board your boat.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Fishing equipment</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Electronics & navigation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Personal belongings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Safety equipment</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🚁</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Emergency Services</h3>
              <p className="text-slate-600 mb-6">
                Coverage for towing, emergency assistance, and other services when 
                you're stranded on the water.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>On-water towing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Emergency assistance</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Fuel delivery</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Jump start service</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🏥</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Medical Payments</h3>
              <p className="text-slate-600 mb-6">
                Covers medical expenses for you and your passengers regardless 
                of who is at fault in an accident.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Medical expenses</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Hospital costs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Rehabilitation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Funeral expenses</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🌊</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Pollution Liability</h3>
              <p className="text-slate-600 mb-6">
                Protects against costs associated with fuel spills and other 
                environmental damage caused by your boat.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Fuel spill cleanup</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Environmental damage</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Legal defense</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Government fines</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Insurance Calculator */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Insurance Cost Calculator
            </h2>
            <p className="text-xl text-slate-600">
              Get an instant estimate for your boat insurance premium
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Boat Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      placeholder="75,000"
                      className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Boat Type
                  </label>
                  <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select boat type</option>
                    <option value="sailboat">Sailboat</option>
                    <option value="motor-yacht">Motor Yacht</option>
                    <option value="fishing-boat">Fishing Boat</option>
                    <option value="pontoon">Pontoon</option>
                    <option value="jet-ski">Personal Watercraft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Primary Use
                  </label>
                  <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="pleasure">Pleasure/Recreation</option>
                    <option value="fishing">Fishing</option>
                    <option value="racing">Racing</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Years of Boating Experience
                  </label>
                  <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="0-2">0-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Estimated Premium</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-200">
                    <span className="text-slate-600">Annual Premium:</span>
                    <span className="text-3xl font-bold text-blue-600">$1,250</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Hull Coverage:</span>
                      <span className="font-semibold">$850</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Liability:</span>
                      <span className="font-semibold">$250</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Personal Property:</span>
                      <span className="font-semibold">$100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Emergency Services:</span>
                      <span className="font-semibold">$50</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-800">
                    <strong>Potential Savings:</strong> Up to 25% with multi-policy discount
                  </div>
                </div>

                <button className="w-full btn-primary mt-6">
                  Get Personalized Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Our Partners */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose Our Insurance Partners?
            </h2>
            <p className="text-xl text-slate-600">
              We work with A-rated marine insurance specialists
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">A+ Rated Insurers</h3>
              <p className="text-slate-600">All our partners maintain excellent financial strength ratings.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚤</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Marine Specialists</h3>
              <p className="text-slate-600">Insurers who understand boats and the marine environment.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Competitive Rates</h3>
              <p className="text-slate-600">Compare quotes to find the best coverage at the best price.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📞</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">24/7 Claims Support</h3>
              <p className="text-slate-600">Round-the-clock assistance when you need it most.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Protect Your Investment Today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get comprehensive boat insurance coverage from trusted marine specialists
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-secondary btn-lg">
              <span className="flex items-center space-x-2">
                <span>📋</span>
                <span>Get Free Quote</span>
              </span>
            </button>
            <button className="btn-ghost border-white/30 hover:bg-white/10">
              <span className="flex items-center space-x-2">
                <span>📞</span>
                <span>Speak with Agent</span>
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}