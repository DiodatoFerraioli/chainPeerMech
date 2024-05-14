'''
  File: 	profile_generator.py
  Author:	Nicholas Mattei (nicholas.mattei@nicta.com.au)
  Date:	Sept 11, 2013
      November 6th, 2013
      July 30th, 2014
  * Copyright (c) 2014, Nicholas Mattei and NICTA
  * All rights reserved.
  *
  * Developed by: Nicholas Mattei
  *               NICTA
  *               http://www.nickmattei.net
  *               http://www.preflib.org
  *
  * Redistribution and use in source and binary forms, with or without
  * modification, are permitted provided that the following conditions are met:
  *     * Redistributions of source code must retain the above copyright
  *       notice, this list of conditions and the following disclaimer.
  *     * Redistributions in binary form must reproduce the above copyright
  *       notice, this list of conditions and the following disclaimer in the
  *       documentation and/or other materials provided with the distribution.
  *     * Neither the name of NICTA nor the
  *       names of its contributors may be used to endorse or promote products
  *       derived from this software without specific prior written permission.
  *
  * THIS SOFTWARE IS PROVIDED BY NICTA ''AS IS'' AND ANY
  * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
  * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
  * DISCLAIMED. IN NO EVENT SHALL NICTA BE LIABLE FOR ANY
  * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.	

About
--------------------
  This file generates voting profiles according to a given distribution.
  It requires PreflibUtils to work properly.
NOTE
--------------------
  This is a heavily modified version of this file which does not
  require the use of PrefLibUtils for use only with the Impartial
  experiments.

'''
import random
import itertools
import math
import copy
import argparse
import sys
import collections
from scipy import stats
import numpy as np

_DEBUG = False

def generate_approx_m_regular_assignment(agents, m, clusters={}):
  """
  Creates an "approximatly" m regular reviewing assignment
  for all agents subject to the restriction that no one 
  reviews themselves or anyone in their cluster.  This is
  approximate as it will balance as much as possible
  but not be exact.  We attempt to do this in a cyclical manner;
  this algorithm will fail if each person is asked to review
  too many people or the clusters are not balanced.
  Parameters
  -----------
  agents: array like
    list of agents to be reviewed.
  m: integer
    Number of elements that each agent should review.  This does
    not mean the number of reviews that each agent will recieve.
  clusters: dict
    A mapping from integer ---> [agents] where each agent in an 
    partition together.  Agents should not review other agents 
    in their own partition.  Also, partitions must be disjoint.
  Returns
  -----------
  assignment: dict
    A dict from agent --> [agents] which is a list of lenght m
    of agents not in the partition of agent i.
  Notes
  -----------
  """
  #Make everone their own cluster if we don't have a clustering.
  clusters = {i:[agents[i]] for i in range(len(agents))}
  if _DEBUG: print("\nClusters:\n" + str(clusters))

  # Do a check here -- if, for every cluster, the number of agents
  # outside is < m fail, can't review 2x.
  if any([m > len(agents) - len(ci) for k,ci in clusters.items()]):
    print("m is larger than N - Ci for some Ci, duplicate review required.")
    return 0

  cluster_assignment = {}
  # Shuffling a dequq scales as n^2, faster to copy..
  t = list(clusters.keys())
  random.shuffle(t)
  cluster_deq = collections.deque(t)

  for j in clusters.keys():
    current = cluster_deq.popleft()
    c_list = list(cluster_deq)
    assn = c_list*math.ceil(m*len(clusters[current]) / len(c_list))
    assn = assn[:m*len(clusters[current])]
    cluster_assignment[current] = assn
    cluster_deq.append(current)

  if _DEBUG: print("Cluster Assignment: " + str(cluster_assignment))

  agent_to_clusters = {k:[] for k in agents}
  # Iterate over a cluster --> cluster assignment and convert it
  # to a agent --> cluster assignement using a canoical ordering
  # for the agents in each cluster on the RHS.
  for c_cluster in cluster_assignment.keys():
    c_agents = copy.copy(clusters[c_cluster])
    random.shuffle(c_agents)
    targets = cluster_assignment[c_cluster]
    for c_a in c_agents:
      agent_to_clusters[c_a] = targets[:m]
      targets = targets[m:]

  if _DEBUG: print("Agents to Clusters: " + str(agent_to_clusters))

  # Convert the RHS.  For every agent, replace a agent --> cluster
  # assignment to a agent --> agent assignment.  Use a canoical 
  # ordering of the agents on the RHS randomized if necessary.

  agent_assignment = {k:[] for k in agents}
  target_order = {}
  # Build RHS ordering.
  for k,v in clusters.items():
    t = copy.copy(v)
    random.shuffle(t)
    target_order[k] = collections.deque(t)

  for a, t in agent_to_clusters.items():
    # For each target cluster
    for cc in t:
      #Assign the front of the list and then rotate it 
      agent_assignment[a].append(target_order[cc][0])
      target_order[cc].rotate(-1)

  # Post check for duplicates..
  for k,v in agent_assignment.items():
    if len(v) != len(set(v)):
      print("Double review assignment: ", str(k), " :: ", str(v))
    if len(v) != m:
      print("Error in assignment, agent ", str(k), " has less than m reviews ", str(v))
  if _DEBUG: print("Agent to Agent: " + str(agent_assignment))

  return agent_assignment