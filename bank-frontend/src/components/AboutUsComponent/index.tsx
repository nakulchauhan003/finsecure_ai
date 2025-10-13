import { Link } from 'react-router-dom';
import './style.css';
export default function AboutUsComponent(){
    return(
        <div className="main-container">
                <div className='About-container'>ABOUT US</div>
                <div className='wrapper'>
                    <div className="main-container-first">
                        <p className='pt-5 text-xl'>We're a team of AI enthusiasts, finance experts, and developers who came together to build a smarter solution to one of the most important financial decisions-loans.Whether you're a customer seeking clarity or a bank striving for efficiency, FinScope makes lending smarter and simpler.</p>
                        <Link to={'/'}><button type='button' className='explore-button'>Explore</button></Link>
                    </div>
                    <div className="main-container-third">
                        <h1 className='text-4xl'>People</h1>
                        <div className='people-section'>
                            <div>
                                <img className='people-section-image' src="https://images.unsplash.com/photo-1707061229211-25325f7134ce?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29tbW9uJTIwdXNlciUyMHByb2ZpbGV8ZW58MHx8MHx8fDA%3D" alt="#" />
                            </div>
                            <div className='people-section-details'>
                                <div>
                                    Name1
                                </div>
                                <div className='text-[rgba(0,0,0,0.7)]'>
                                    CTO
                                </div>
                            </div>
                        </div>
                        <div className='people-section'>
                            <div>
                                <img className='people-section-image' src="https://images.unsplash.com/photo-1707061229211-25325f7134ce?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29tbW9uJTIwdXNlciUyMHByb2ZpbGV8ZW58MHx8MHx8fDA%3D" alt="#" />
                            </div>
                            <div className='people-section-details'>
                                <div>
                                    Name3
                                </div>
                                <div className='text-[rgba(0,0,0,0.7)]'>
                                    Description
                                </div>
                            </div>
                        </div>
                        <div className='people-section'>
                            <div>
                                <img className='people-section-image' src="https://images.unsplash.com/photo-1707061229211-25325f7134ce?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29tbW9uJTIwdXNlciUyMHByb2ZpbGV8ZW58MHx8MHx8fDA%3D" alt="#" />
                            </div>
                            <div className='people-section-details'>
                                <div>
                                    Name3
                                </div>
                                <div className='text-[rgba(0,0,0,0.7)]'>
                                    Description
                                </div>
                            </div>
                        </div>
                        <div className='people-section'>
                            <div>
                                <img className='people-section-image' src="https://images.unsplash.com/photo-1707061229211-25325f7134ce?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29tbW9uJTIwdXNlciUyMHByb2ZpbGV8ZW58MHx8MHx8fDA%3D" alt="#" />
                            </div>
                            <div className='people-section-details'>
                                <div>
                                    Name4
                                </div>
                                <div className='text-[rgba(0,0,0,0.7)]'>
                                    Description
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        </div>
    )
}