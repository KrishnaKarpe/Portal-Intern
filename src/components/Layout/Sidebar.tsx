
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, Layers, RefreshCw, List, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    name: 'Clone Product Across Orgs',
    path: '/clone-product',
    icon: <Layers className="h-5 w-5 mr-3" />,
  },
  {
    name: 'Create Product',
    path: '/update-product',
    icon: <RefreshCw className="h-5 w-5 mr-3" />,
  },
  {
    name: 'Update Product',
    path: '/update-product',
    icon: <RefreshCw className="h-5 w-5 mr-3" />,
  },

  {
    name: 'List All Proxies',
    path: '/list-proxies',
    icon: <List className="h-5 w-5 mr-3" />,
  },
  {
    name: 'List All Products',
    path: '/list-products',
    icon: <Package className="h-5 w-5 mr-3" />,
  },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ width: 280 }}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.3 }}
        className="bg-navy h-screen fixed left-0 top-0 z-20 shadow-lg flex flex-col"
      >
        <div className="p-5 flex items-center justify-between border-b border-sidebar-border">
          {!collapsed && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-white text-xl font-semibold"
            >
              Product Management
            </motion.h1>
          )}
          <button 
            onClick={toggleSidebar} 
            className="text-white p-2 rounded-md hover:bg-sidebar-accent transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pt-4">
          <nav>
            <ul className="flex flex-col gap-2 px-3">
              {menuItems.map((item, index) => (
                <motion.li 
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => cn(
                      "menu-item",
                      isActive ? "menu-item-active" : "",
                      collapsed ? "justify-center" : "justify-start"
                    )}
                  >
                    {item.icon}
                    {!collapsed && (
                      <span className="transition-opacity">{item.name}</span>
                    )}
                  </NavLink>
                </motion.li>
              ))}
            </ul>
          </nav>
        </div>
      </motion.div>
    </div>
  );
};

export default Sidebar;
