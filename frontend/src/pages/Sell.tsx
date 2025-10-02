import { Link } from 'react-router-dom';

export default function Sell() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Hero Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center">
                        <h1 className="text-5xl font-bold mb-6">
                            Sell Your Boat with Confidence
                        </h1>
                        <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                            Join thousands of boat owners who trust MarineMarket to connect with serious buyers.
                            Our premium marketplace ensures maximum exposure and competitive pricing.
                        </p>
                        <Link to="/create" className="btn-secondary btn-lg">
                            <span className="flex items-center space-x-2">
                                <span>🚤</span>
                                <span>List Your Boat Now</span>
                            </span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Why Sell With Us */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">
                            Why Choose MarineMarket?
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            We provide the tools and exposure you need to sell your boat quickly and at the best price.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-3xl">📈</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Maximum Exposure</h3>
                            <p className="text-slate-600 mb-6">
                                Your listing reaches thousands of qualified buyers across our premium network and partner sites.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Featured on homepage</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Social media promotion</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Email marketing campaigns</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-3xl">🛡️</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Secure Transactions</h3>
                            <p className="text-slate-600 mb-6">
                                Our verified buyer network and secure communication tools protect you throughout the sale process.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Buyer verification</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Secure messaging</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Transaction support</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-3xl">💰</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Best Price Guarantee</h3>
                            <p className="text-slate-600 mb-6">
                                Our market analysis tools and pricing experts help you price competitively for faster sales.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Free boat valuation</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Market analysis</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Pricing recommendations</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-slate-600">
                            Selling your boat is simple with our streamlined process
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-white text-2xl font-bold">1</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Create Your Listing</h3>
                            <p className="text-slate-600">
                                Upload photos, add details, and set your price with our easy-to-use listing tool.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-white text-2xl font-bold">2</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Get Discovered</h3>
                            <p className="text-slate-600">
                                Your boat gets featured across our network, reaching thousands of potential buyers.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-white text-2xl font-bold">3</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Connect with Buyers</h3>
                            <p className="text-slate-600">
                                Receive inquiries from verified buyers and communicate securely through our platform.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-white text-2xl font-bold">4</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Close the Deal</h3>
                            <p className="text-slate-600">
                                Complete your sale with confidence using our transaction support and documentation tools.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-xl text-slate-600">
                            No hidden fees. Pay only when you sell.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-8 shadow-lg">
                        <div className="text-center">
                            <div className="text-5xl font-bold text-blue-600 mb-4">3.5%</div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Success Fee</h3>
                            <p className="text-slate-600 mb-8">
                                Only pay when your boat sells. No upfront costs, no monthly fees.
                            </p>

                            <div className="grid md:grid-cols-2 gap-8 text-left">
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-4">What's Included:</h4>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-center space-x-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Unlimited photos</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Premium listing placement</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Professional photography tips</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Market analysis report</span>
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-4">Premium Support:</h4>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-center space-x-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Dedicated account manager</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Transaction assistance</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Legal documentation help</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <span className="text-green-500">✓</span>
                                            <span>24/7 customer support</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-4xl font-bold mb-6">
                        Ready to Sell Your Boat?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Join thousands of successful sellers on MarineMarket
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/create" className="btn-secondary btn-lg">
                            <span className="flex items-center space-x-2">
                                <span>🚤</span>
                                <span>List Your Boat</span>
                            </span>
                        </Link>
                        <Link to="/valuation" className="btn-ghost border-white/30 hover:bg-white/10">
                            <span className="flex items-center space-x-2">
                                <span>📊</span>
                                <span>Get Free Valuation</span>
                            </span>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}