import { useState } from 'react';

export default function Valuation() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    boatType: '',
    manufacturer: '',
    model: '',
    year: '',
    length: '',
    condition: '',
    location: '',
    features: [] as string[]
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Free Boat Valuation
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Get an accurate market value for your boat in minutes. Our advanced valuation tool 
              uses real market data and comparable sales to provide precise estimates.
            </p>
          </div>
        </div>
      </section>

      {/* Valuation Form */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-600">Step {step} of 4</span>
                <span className="text-sm font-medium text-slate-600">{Math.round((step / 4) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                ></div>
              </div>
            </div>

            {step === 1 && (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Basic Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Boat Type *
                    </label>
                    <select 
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.boatType}
                      onChange={(e) => setFormData({...formData, boatType: e.target.value})}
                    >
                      <option value="">Select boat type</option>
                      <option value="sailboat">Sailboat</option>
                      <option value="motor-yacht">Motor Yacht</option>
                      <option value="fishing-boat">Fishing Boat</option>
                      <option value="pontoon">Pontoon</option>
                      <option value="catamaran">Catamaran</option>
                      <option value="speedboat">Speedboat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Year *
                    </label>
                    <input
                      type="number"
                      placeholder="2020"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Sea Ray, Boston Whaler"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Model *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Sundancer 320"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Length (feet) *
                    </label>
                    <input
                      type="number"
                      placeholder="32"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.length}
                      onChange={(e) => setFormData({...formData, length: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Condition & Location</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Overall Condition *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['Excellent', 'Very Good', 'Good', 'Fair'].map((condition) => (
                        <button
                          key={condition}
                          type="button"
                          className={`p-4 border-2 rounded-lg text-center transition-all ${
                            formData.condition === condition.toLowerCase()
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                          onClick={() => setFormData({...formData, condition: condition.toLowerCase()})}
                        >
                          <div className="font-semibold">{condition}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location (State) *
                    </label>
                    <select 
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    >
                      <option value="">Select state</option>
                      <option value="FL">Florida</option>
                      <option value="CA">California</option>
                      <option value="TX">Texas</option>
                      <option value="NY">New York</option>
                      <option value="WA">Washington</option>
                      {/* Add more states */}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Features & Equipment</h2>
                <p className="text-slate-600 mb-6">Select all features that apply to your boat:</p>
                
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    'GPS/Chartplotter', 'Radar', 'Autopilot', 'Bow Thruster', 'Generator',
                    'Air Conditioning', 'Watermaker', 'Windlass', 'Hardtop', 'T-Top',
                    'Outriggers', 'Fishing Package', 'Dive Package', 'Sound System',
                    'Refrigerator', 'Microwave', 'Grill', 'Swim Platform', 'Davit'
                  ].map((feature) => (
                    <label key={feature} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        checked={formData.features.includes(feature)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, features: [...formData.features, feature]});
                          } else {
                            setFormData({...formData, features: formData.features.filter(f => f !== feature)});
                          }
                        }}
                      />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Your Boat Valuation</h2>
                
                <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-8 mb-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-blue-600 mb-4">$185,000</div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Estimated Market Value</h3>
                    <p className="text-slate-600">Based on current market conditions and comparable sales</p>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">$175,000</div>
                      <div className="text-sm text-slate-600">Low Estimate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">$185,000</div>
                      <div className="text-sm text-slate-600">Market Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">$195,000</div>
                      <div className="text-sm text-slate-600">High Estimate</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-slate-900 mb-4">Valuation Details</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Base Value:</span>
                      <span className="font-semibold">$170,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Condition Adjustment:</span>
                      <span className="font-semibold text-green-600">+$8,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Features & Equipment:</span>
                      <span className="font-semibold text-green-600">+$7,000</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between">
                      <span className="font-bold text-slate-900">Total Estimated Value:</span>
                      <span className="font-bold text-blue-600">$185,000</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <button className="btn-primary btn-lg mr-4">
                    List Your Boat Now
                  </button>
                  <button className="btn-secondary">
                    Get Detailed Report
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-8 border-t border-slate-200">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className={`px-6 py-3 rounded-lg font-medium ${
                  step === 1
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Previous
              </button>
              
              {step < 4 ? (
                <button
                  onClick={() => setStep(Math.min(4, step + 1))}
                  className="btn-primary"
                >
                  Next Step
                </button>
              ) : (
                <button className="btn-primary">
                  Get Full Report
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why Use Our Valuation */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Trust Our Valuation?
            </h2>
            <p className="text-xl text-slate-600">
              Our advanced algorithm considers multiple factors for accurate pricing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Real Market Data</h3>
              <p className="text-slate-600">
                We analyze thousands of recent sales, current listings, and market trends to provide accurate valuations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Precise Algorithms</h3>
              <p className="text-slate-600">
                Our AI-powered system considers boat condition, features, location, and market demand for precise estimates.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🔄</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Updated Daily</h3>
              <p className="text-slate-600">
                Our database is updated daily with new sales data and market information to ensure current valuations.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}