import { Link } from 'react-router-dom';

export default function Finance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Boat Financing Made Simple
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Get pre-approved for your dream boat with competitive rates and flexible terms. 
              Our trusted lending partners make boat ownership accessible.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-secondary btn-lg">
                <span className="flex items-center space-x-2">
                  <span>💰</span>
                  <span>Get Pre-Approved</span>
                </span>
              </button>
              <button className="btn-ghost border-white/30 hover:bg-white/10">
                <span className="flex items-center space-x-2">
                  <span>🧮</span>
                  <span>Calculate Payments</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Financing Options */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Flexible Financing Options
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Choose from a variety of loan programs designed specifically for boat purchases
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🏦</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Traditional Marine Loans</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-600">Interest Rates:</span>
                  <span className="font-semibold text-green-600">4.99% - 8.99%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Loan Terms:</span>
                  <span className="font-semibold">5-20 years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Down Payment:</span>
                  <span className="font-semibold">10-20%</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Fixed or variable rates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Up to $2M financing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>New and used boats</span>
                </li>
              </ul>
              <button className="w-full btn-primary">Learn More</button>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-200">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">⭐</span>
              </div>
              <div className="text-center mb-4">
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">MOST POPULAR</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Preferred Marine Financing</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-600">Interest Rates:</span>
                  <span className="font-semibold text-green-600">3.99% - 7.99%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Loan Terms:</span>
                  <span className="font-semibold">7-25 years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Down Payment:</span>
                  <span className="font-semibold">5-15%</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Preferred customer rates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Up to $5M financing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Fast approval process</span>
                </li>
              </ul>
              <button className="w-full btn-primary">Get Pre-Approved</button>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🏆</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Luxury Yacht Financing</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-600">Interest Rates:</span>
                  <span className="font-semibold text-green-600">3.49% - 6.99%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Loan Terms:</span>
                  <span className="font-semibold">10-30 years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Down Payment:</span>
                  <span className="font-semibold">10-25%</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Luxury vessel specialists</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Up to $50M financing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Concierge service</span>
                </li>
              </ul>
              <button className="w-full btn-primary">Contact Specialist</button>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Calculator */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Payment Calculator
            </h2>
            <p className="text-xl text-slate-600">
              Estimate your monthly payments with our interactive calculator
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Boat Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      placeholder="150,000"
                      className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Down Payment
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      placeholder="30,000"
                      className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5.99"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Loan Term (years)
                  </label>
                  <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="5">5 years</option>
                    <option value="7">7 years</option>
                    <option value="10">10 years</option>
                    <option value="15">15 years</option>
                    <option value="20">20 years</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Payment Estimate</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-200">
                    <span className="text-slate-600">Monthly Payment:</span>
                    <span className="text-3xl font-bold text-blue-600">$847</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Loan Amount:</span>
                      <span className="font-semibold">$120,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Interest:</span>
                      <span className="font-semibold">$21,640</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Payments:</span>
                      <span className="font-semibold">$141,640</span>
                    </div>
                  </div>
                </div>

                <button className="w-full btn-primary mt-6">
                  Get Pre-Approved for This Amount
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Our Financing */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose Our Financing Partners?
            </h2>
            <p className="text-xl text-slate-600">
              We work with the industry's most trusted marine lenders
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Fast Approval</h3>
              <p className="text-slate-600">Get approved in as little as 24 hours with our streamlined process.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Competitive Rates</h3>
              <p className="text-slate-600">Access to exclusive rates and terms from top marine lenders.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Expert Support</h3>
              <p className="text-slate-600">Dedicated marine financing specialists guide you through the process.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Simple Process</h3>
              <p className="text-slate-600">Minimal paperwork and hassle-free application process.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Finance Your Dream Boat?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get pre-approved today and start shopping with confidence
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-secondary btn-lg">
              <span className="flex items-center space-x-2">
                <span>💰</span>
                <span>Get Pre-Approved</span>
              </span>
            </button>
            <Link to="/search" className="btn-ghost border-white/30 hover:bg-white/10">
              <span className="flex items-center space-x-2">
                <span>🔍</span>
                <span>Browse Boats</span>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}