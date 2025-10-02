import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              About MarineMarket
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              The premier destination for buying and selling boats. We're revolutionizing the marine marketplace 
              with cutting-edge technology and unparalleled service.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Our Mission
              </h2>
              <p className="text-xl text-slate-600 mb-6">
                To create the world's most trusted and efficient marketplace for marine vessels, 
                connecting passionate boat enthusiasts with their perfect match.
              </p>
              <p className="text-slate-600 mb-8">
                We believe that buying or selling a boat should be an exciting and seamless experience. 
                That's why we've built a platform that combines advanced technology with personalized service, 
                ensuring every transaction is secure, transparent, and successful.
              </p>
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">50K+</div>
                  <div className="text-sm text-slate-600">Boats Listed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">25K+</div>
                  <div className="text-sm text-slate-600">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">$2B+</div>
                  <div className="text-sm text-slate-600">Boats Sold</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-slate-100 rounded-2xl p-8 shadow-xl">
                <div className="text-6xl mb-6 text-center">⚓</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">
                  Founded in 2020
                </h3>
                <p className="text-slate-600 text-center">
                  Born from a passion for boating and a vision to modernize the marine marketplace. 
                  Our founders, experienced boat owners themselves, saw the need for a better way to 
                  buy and sell boats.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Our Values
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Trust & Security</h3>
              <p className="text-slate-600">
                Every transaction is protected by our comprehensive verification system and secure payment processing. 
                Your safety and peace of mind are our top priorities.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Excellence</h3>
              <p className="text-slate-600">
                We're committed to delivering exceptional service and continuously improving our platform 
                to exceed your expectations at every touchpoint.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🤝</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Community</h3>
              <p className="text-slate-600">
                We're more than a marketplace – we're a community of boat lovers. We foster connections 
                and support the marine lifestyle we all cherish.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-slate-600">
              Passionate boaters and technology experts working together
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">JD</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">John Davis</h3>
              <p className="text-blue-600 font-medium mb-4">CEO & Co-Founder</p>
              <p className="text-slate-600 text-sm">
                Former yacht broker with 15+ years in marine sales. Passionate about sailing and 
                bringing transparency to boat transactions.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">SM</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sarah Martinez</h3>
              <p className="text-green-600 font-medium mb-4">CTO & Co-Founder</p>
              <p className="text-slate-600 text-sm">
                Tech veteran with expertise in marketplace platforms. Avid powerboat enthusiast 
                who loves weekend fishing trips.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">MR</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Mike Rodriguez</h3>
              <p className="text-purple-600 font-medium mb-4">Head of Operations</p>
              <p className="text-slate-600 text-sm">
                Marine industry expert with deep knowledge of boat valuation and market trends. 
                Competitive sailor and boat restoration enthusiast.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Powered by Innovation
              </h2>
              <p className="text-xl text-slate-600 mb-6">
                Our cutting-edge platform leverages the latest technology to deliver 
                an unparalleled boat buying and selling experience.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🤖</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">AI-Powered Matching</h3>
                    <p className="text-slate-600">
                      Our intelligent algorithms match buyers with their perfect boats based on preferences, 
                      budget, and usage patterns.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📱</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Mobile-First Design</h3>
                    <p className="text-slate-600">
                      Browse, list, and manage your boats from anywhere with our responsive, 
                      mobile-optimized platform.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🔒</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Blockchain Security</h3>
                    <p className="text-slate-600">
                      Advanced encryption and blockchain technology ensure your transactions 
                      and personal data are always secure.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="text-center">
                <div className="text-5xl mb-6">🚀</div>
                <h3 className="text-2xl font-bold mb-4">Always Innovating</h3>
                <p className="text-blue-100 mb-6">
                  We're constantly developing new features and improvements based on user feedback 
                  and industry trends.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="font-bold">Virtual Tours</div>
                    <div className="text-blue-100">360° boat viewing</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="font-bold">AR Features</div>
                    <div className="text-blue-100">Augmented reality</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="font-bold">Smart Contracts</div>
                    <div className="text-blue-100">Automated escrow</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="font-bold">IoT Integration</div>
                    <div className="text-blue-100">Connected boats</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Join the MarineMarket Community
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Whether you're buying your first boat or selling your yacht, we're here to help
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search" className="btn-secondary btn-lg">
              <span className="flex items-center space-x-2">
                <span>🔍</span>
                <span>Browse Boats</span>
              </span>
            </Link>
            <Link to="/create" className="btn-ghost border-white/30 hover:bg-white/10">
              <span className="flex items-center space-x-2">
                <span>📝</span>
                <span>List Your Boat</span>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}